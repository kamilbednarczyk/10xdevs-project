import type { SupabaseClient } from "../../db/supabase.client";
import type { GenerationResponseDTO, FlashcardProposalDTO } from "../../types";
import { MockAIService } from "./mock-ai.service";

/**
 * Generation Service Error
 * Custom error class for generation-related failures
 */
export class GenerationServiceError extends Error {
  constructor(
    message: string,
    public code: "AI_SERVICE_ERROR" | "DATABASE_ERROR" | "INTERNAL_ERROR",
    public details?: unknown
  ) {
    super(message);
    this.name = "GenerationServiceError";
  }
}

/**
 * Generation Service
 * Handles the business logic for AI flashcard generation
 */
export class GenerationService {
  private aiService: MockAIService;
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.aiService = new MockAIService();
  }

  /**
   * Generate flashcards from text and create a generation record
   *
   * @param text - The input text to generate flashcards from
   * @param userId - The ID of the user creating the generation (temporary mock value for development)
   * @returns Generation response with proposals
   * @throws GenerationServiceError if generation or database operation fails
   */
  async generateFromText(
    text: string,
    userId = "76fede39-2c1e-4c2c-90ed-e45372846068" // Mock user ID for development
  ): Promise<GenerationResponseDTO> {
    let proposals: FlashcardProposalDTO[];

    // Step 1: Call AI service to generate proposals
    try {
      proposals = await this.aiService.generateFlashcards(text);
    } catch (error) {
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
