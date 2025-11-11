import type { SupabaseClient } from "../../db/supabase.client";
import type { CreateFlashcardCommand, CreateFlashcardsBatchCommand, FlashcardResponseDTO } from "../../types";

/**
 * Flashcard Service Error
 * Custom error class for flashcard-related failures
 */
export class FlashcardServiceError extends Error {
  constructor(
    message: string,
    public code: "VALIDATION_ERROR" | "NOT_FOUND" | "FORBIDDEN" | "DATABASE_ERROR" | "INTERNAL_ERROR",
    public details?: unknown
  ) {
    super(message);
    this.name = "FlashcardServiceError";
  }
}

/**
 * Flashcard Service
 * Handles the business logic for flashcard operations
 */
export class FlashcardService {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Create a single flashcard
   * Creates a new flashcard with SM-2 algorithm default values
   *
   * @param command - The flashcard creation command with front, back, and generation_type
   * @param userId - The ID of the user creating the flashcard
   * @returns The created flashcard
   * @throws FlashcardServiceError if validation or database operation fails
   */
  async createFlashcard(command: CreateFlashcardCommand, userId: string): Promise<FlashcardResponseDTO> {
    const { front, back, generation_type } = command;

    // Prepare flashcard record for insertion
    // SM-2 algorithm default values
    const now = new Date().toISOString();
    const flashcardToInsert = {
      user_id: userId,
      front,
      back,
      generation_type,
      generation_id: null, // Single flashcard creation is always manual, so generation_id is null
      // SM-2 defaults
      interval: 0,
      repetition: 0,
      ease_factor: 2.5,
      due_date: now,
    };

    // Insert flashcard into database
    const { data: createdFlashcard, error: insertError } = await this.supabase
      .from("flashcards")
      .insert(flashcardToInsert)
      .select()
      .single();

    if (insertError) {
      throw new FlashcardServiceError("Failed to create flashcard in database", "DATABASE_ERROR", insertError);
    }

    if (!createdFlashcard) {
      throw new FlashcardServiceError("No flashcard was created", "DATABASE_ERROR", { createdFlashcard });
    }

    return createdFlashcard;
  }

  /**
   * Create multiple flashcards in a batch operation
   * Atomically creates flashcards and updates generation accepted_count
   *
   * @param command - The batch creation command with flashcard data
   * @param userId - The ID of the user creating the flashcards
   * @returns Array of created flashcards
   * @throws FlashcardServiceError if validation or database operation fails
   */
  async createFlashcardsBatch(command: CreateFlashcardsBatchCommand, userId: string): Promise<FlashcardResponseDTO[]> {
    const { flashcards } = command;

    // Step 1: Collect unique generation_ids from AI flashcards
    const generationIds = new Set<number>();
    for (const flashcard of flashcards) {
      if (flashcard.generation_type === "ai" && flashcard.generation_id !== null) {
        generationIds.add(flashcard.generation_id);
      }
    }

    // Step 2: Verify that all generation_ids exist and belong to the user
    if (generationIds.size > 0) {
      const { data: generations, error: generationsError } = await this.supabase
        .from("generations")
        .select("id, user_id")
        .in("id", Array.from(generationIds));

      if (generationsError) {
        throw new FlashcardServiceError("Failed to verify generation records", "DATABASE_ERROR", generationsError);
      }

      // Check if all requested generation_ids were found
      if (!generations || generations.length !== generationIds.size) {
        const foundIds = new Set(generations?.map((g) => g.id) || []);
        const missingIds = Array.from(generationIds).filter((id) => !foundIds.has(id));
        throw new FlashcardServiceError("One or more generation records not found", "NOT_FOUND", {
          missing_generation_ids: missingIds,
        });
      }

      // Check if all generations belong to the user
      const unauthorizedGenerations = generations.filter((g) => g.user_id !== userId);
      if (unauthorizedGenerations.length > 0) {
        throw new FlashcardServiceError(
          "Cannot create flashcards for generations that belong to another user",
          "FORBIDDEN",
          {
            unauthorized_generation_ids: unauthorizedGenerations.map((g) => g.id),
          }
        );
      }
    }

    // Step 3: Prepare flashcard records for insertion
    // SM-2 algorithm default values
    const now = new Date().toISOString();
    const flashcardsToInsert = flashcards.map((flashcard) => ({
      user_id: userId,
      front: flashcard.front,
      back: flashcard.back,
      generation_type: flashcard.generation_type,
      generation_id: flashcard.generation_id,
      // SM-2 defaults
      interval: 0,
      repetition: 0,
      ease_factor: 2.5,
      due_date: now,
    }));

    // Step 4: Execute database operations in a transaction-like manner
    // Note: Supabase doesn't expose traditional transactions in JS client,
    // but we can minimize race conditions by performing operations sequentially

    // Insert flashcards
    const { data: createdFlashcards, error: insertError } = await this.supabase
      .from("flashcards")
      .insert(flashcardsToInsert)
      .select();

    if (insertError) {
      throw new FlashcardServiceError("Failed to create flashcards in database", "DATABASE_ERROR", insertError);
    }

    if (!createdFlashcards || createdFlashcards.length === 0) {
      throw new FlashcardServiceError("No flashcards were created", "DATABASE_ERROR", { createdFlashcards });
    }

    // Step 5: Update accepted_count for each generation
    if (generationIds.size > 0) {
      // Count how many flashcards per generation_id
      const generationCounts = new Map<number, number>();
      for (const flashcard of flashcards) {
        if (flashcard.generation_type === "ai" && flashcard.generation_id !== null) {
          const currentCount = generationCounts.get(flashcard.generation_id) || 0;
          generationCounts.set(flashcard.generation_id, currentCount + 1);
        }
      }

      // Update each generation's accepted_count
      // We need to do this for each generation separately to increment properly
      for (const [generationId, count] of generationCounts.entries()) {
        // First, get current accepted_count
        const { data: generation, error: fetchError } = await this.supabase
          .from("generations")
          .select("accepted_count")
          .eq("id", generationId)
          .single();

        if (fetchError) {
          // Log error but don't fail the entire operation since flashcards were already created
          console.error(`Failed to fetch generation ${generationId} for update:`, fetchError);
          continue;
        }

        // Calculate new accepted_count
        const currentAcceptedCount = generation.accepted_count || 0;
        const newAcceptedCount = currentAcceptedCount + count;

        // Update the generation record
        const { error: updateError } = await this.supabase
          .from("generations")
          .update({ accepted_count: newAcceptedCount })
          .eq("id", generationId);

        if (updateError) {
          // Log error but don't fail the entire operation since flashcards were already created
          console.error(`Failed to update accepted_count for generation ${generationId}:`, updateError);
        }
      }
    }

    // Step 6: Return created flashcards
    return createdFlashcards;
  }
}
