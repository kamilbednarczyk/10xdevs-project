import type { SupabaseClient } from "../../db/supabase.client";
import type {
  GenerationResponseDTO,
  FlashcardProposalDTO,
  GenerationListResponseDTO,
  GenerationListItemDTO,
  PaginationDTO,
} from "../../types";
import type { RuntimeEnvSource } from "@/lib/runtime-env";
import { OpenRouterApiError, OpenRouterService } from "./openrouter.service";

/**
 * Generation Service Error
 * Custom error class for generation-related failures
 */
export class GenerationServiceError extends Error {
  constructor(
    message: string,
    public code: "AI_SERVICE_ERROR" | "DATABASE_ERROR" | "INTERNAL_ERROR",
    public details?: unknown,
    public status?: number
  ) {
    super(message);
    this.name = "GenerationServiceError";
  }
}

/**
 * Generation Service
 * Handles the business logic for AI flashcard generation
 */
// Small interface so we can swap between OpenRouterService and mock implementations.
interface FlashcardGenerationService {
  generateFlashcards(text: string): Promise<FlashcardProposalDTO[]>;
}

export class GenerationService {
  private readonly aiService: FlashcardGenerationService;
  private readonly supabase: SupabaseClient;

  constructor(supabase: SupabaseClient, aiService?: FlashcardGenerationService, runtimeEnv?: RuntimeEnvSource) {
    this.supabase = supabase;
    // Allow dependency injection for easier testing/fallbacks.
    this.aiService = aiService ?? new OpenRouterService({ runtimeEnv });
  }

  /**
   * List user generations with pagination
   *
   * @param userId - The ID of the user whose generations to retrieve
   * @param page - Page number (1-indexed)
   * @param limit - Number of items per page
   * @returns Paginated list of generations with computed acceptance_rate
   * @throws GenerationServiceError if database operation fails
   */
  async listUserGenerations(userId: string, page: number, limit: number): Promise<GenerationListResponseDTO> {
    try {
      // Step 1: Get total count of generations for this user
      const { count, error: countError } = await this.supabase
        .from("generations")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      if (countError) {
        throw new GenerationServiceError("Failed to count generations", "DATABASE_ERROR", countError);
      }

      const total = count ?? 0;
      const totalPages = Math.ceil(total / limit);

      // Step 2: Get paginated generations data
      const offset = (page - 1) * limit;
      const { data: generations, error: dataError } = await this.supabase
        .from("generations")
        .select("id, generated_count, accepted_count, created_at, updated_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (dataError) {
        throw new GenerationServiceError("Failed to fetch generations from database", "DATABASE_ERROR", dataError);
      }

      // Step 3: Map results to GenerationListItemDTO with computed acceptance_rate
      const data: GenerationListItemDTO[] = (generations ?? []).map((gen) => ({
        id: gen.id,
        generated_count: gen.generated_count,
        accepted_count: gen.accepted_count,
        acceptance_rate:
          gen.accepted_count !== null && gen.generated_count > 0 ? gen.accepted_count / gen.generated_count : 0,
        created_at: gen.created_at,
        updated_at: gen.updated_at,
      }));

      // Step 4: Build pagination metadata
      const pagination: PaginationDTO = {
        page,
        limit,
        total,
        total_pages: totalPages,
      };

      // Step 5: Return the response
      return {
        data,
        pagination,
      };
    } catch (error) {
      // Re-throw GenerationServiceError as-is
      if (error instanceof GenerationServiceError) {
        throw error;
      }

      // Wrap other errors
      throw new GenerationServiceError("Unexpected error while listing generations", "INTERNAL_ERROR", error);
    }
  }

  /**
   * Get generation details by ID
   *
   * @param id - The generation ID to retrieve
   * @returns Generation object if found, null otherwise
   * @throws GenerationServiceError if database operation fails
   */
  async getGenerationById(id: number): Promise<import("../../types").Generation | null> {
    try {
      const { data, error } = await this.supabase.from("generations").select().eq("id", id).single();

      if (error) {
        // Handle "not found" case - return null instead of throwing
        if (error.code === "PGRST116") {
          return null;
        }
        throw new GenerationServiceError("Failed to fetch generation from database", "DATABASE_ERROR", error);
      }

      return data;
    } catch (error) {
      // Re-throw GenerationServiceError as-is
      if (error instanceof GenerationServiceError) {
        throw error;
      }

      // Wrap other errors
      throw new GenerationServiceError("Unexpected error while fetching generation", "INTERNAL_ERROR", error);
    }
  }

  /**
   * Generate flashcards from text and create a generation record
   *
   * @param text - The input text to generate flashcards from
   * @param userId - The ID of the user creating the generation
   * @returns Generation response with proposals
   * @throws GenerationServiceError if generation or database operation fails
   */
  async generateFromText(text: string, userId: string): Promise<GenerationResponseDTO> {
    let proposals: FlashcardProposalDTO[];

    // Step 1: Call AI service to generate proposals
    try {
      proposals = await this.aiService.generateFlashcards(text);
    } catch (error) {
      if (error instanceof OpenRouterApiError) {
        throw new GenerationServiceError(error.message, "AI_SERVICE_ERROR", error.details ?? error, error.status);
      }
      throw new GenerationServiceError("Failed to generate flashcards from AI service", "AI_SERVICE_ERROR", error);
    }

    // Validate we got proposals
    if (!proposals || proposals.length === 0) {
      throw new GenerationServiceError("AI service returned no flashcard proposals", "AI_SERVICE_ERROR", { proposals });
    }

    const generatedCount = proposals.length;

    // Step 2: Insert generation record into database
    try {
      const { data: generation, error } = await this.supabase
        .from("generations")
        .insert({
          user_id: userId,
          generated_count: generatedCount,
          accepted_count: null, // Will be updated when user accepts flashcards
        })
        .select("id")
        .single();

      if (error) {
        throw new GenerationServiceError("Failed to create generation record in database", "DATABASE_ERROR", error);
      }

      if (!generation) {
        throw new GenerationServiceError("No generation record returned from database", "DATABASE_ERROR", {
          generation,
        });
      }

      // Step 3: Return the response
      return {
        generation_id: generation.id,
        generated_count: generatedCount,
        proposals: proposals,
      };
    } catch (error) {
      // Re-throw GenerationServiceError as-is
      if (error instanceof GenerationServiceError) {
        throw error;
      }

      // Wrap other errors
      throw new GenerationServiceError("Unexpected error during generation process", "INTERNAL_ERROR", error);
    }
  }
}
