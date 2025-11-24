import type { SupabaseClient } from "../../db/supabase.client";
import type {
  CreateFlashcardCommand,
  CreateFlashcardsBatchCommand,
  UpdateFlashcardCommand,
  FlashcardResponseDTO,
  FlashcardListResponseDTO,
  StudyFlashcardDTO,
  ReviewResponseDTO,
  Flashcard,
  SubmitReviewCommand,
} from "../../types";

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
   * Get a single flashcard by ID
   * Retrieves a flashcard (RLS ensures it belongs to the authenticated user)
   *
   * @param flashcardId - The UUID of the flashcard to retrieve
   * @returns The flashcard if found and accessible to the user, null otherwise
   * @throws FlashcardServiceError if database operation fails
   */
  async getFlashcardById(flashcardId: string): Promise<FlashcardResponseDTO | null> {
    // Query database for flashcard with matching id
    // RLS (Row Level Security) automatically filters by authenticated user
    const { data: flashcard, error } = await this.supabase
      .from("flashcards")
      .select("*")
      .eq("id", flashcardId)
      .single();

    if (error) {
      // If error code is PGRST116, it means no rows were found
      // This is not an error, just return null
      if (error.code === "PGRST116") {
        return null;
      }

      // Any other error is a database error
      throw new FlashcardServiceError("Failed to retrieve flashcard from database", "DATABASE_ERROR", error);
    }

    return flashcard;
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

  /**
   * Update flashcard content
   * Updates the front and back content of an existing flashcard
   * RLS ensures only the owner can update their flashcards
   *
   * @param flashcardId - The UUID of the flashcard to update
   * @param command - The update command with new front and back content
   * @returns The updated flashcard if found and updated, null otherwise
   * @throws FlashcardServiceError if database operation fails
   */
  async updateFlashcard(flashcardId: string, command: UpdateFlashcardCommand): Promise<FlashcardResponseDTO | null> {
    const { front, back } = command;

    // Update flashcard in database
    // RLS (Row Level Security) automatically filters by authenticated user
    // The update will only succeed if the flashcard belongs to the user
    const { data: updatedFlashcard, error } = await this.supabase
      .from("flashcards")
      .update({
        front,
        back,
        updated_at: new Date().toISOString(),
      })
      .eq("id", flashcardId)
      .select()
      .single();

    if (error) {
      // If error code is PGRST116, it means no rows were found or updated
      // This happens when the flashcard doesn't exist or doesn't belong to the user
      if (error.code === "PGRST116") {
        return null;
      }

      // Any other error is a database error
      throw new FlashcardServiceError("Failed to update flashcard in database", "DATABASE_ERROR", error);
    }

    return updatedFlashcard;
  }

  /**
   * Delete a flashcard permanently
   * Deletes a flashcard from the database
   * RLS ensures only the owner can delete their flashcards
   *
   * @param flashcardId - The UUID of the flashcard to delete
   * @returns true if flashcard was deleted, false if not found or not authorized
   * @throws FlashcardServiceError if database operation fails
   */
  async deleteFlashcard(flashcardId: string): Promise<boolean> {
    // Delete flashcard from database
    // RLS (Row Level Security) automatically filters by authenticated user
    // The delete will only succeed if the flashcard belongs to the user
    const { error, count } = await this.supabase.from("flashcards").delete({ count: "exact" }).eq("id", flashcardId);

    if (error) {
      // Any error during deletion is a database error
      throw new FlashcardServiceError("Failed to delete flashcard from database", "DATABASE_ERROR", error);
    }

    // If count is 0, the flashcard was not found or doesn't belong to the user
    // Return false to indicate not found
    if (count === 0) {
      return false;
    }

    // Successfully deleted
    return true;
  }

  /**
   * List user flashcards with pagination and sorting
   * Retrieves a paginated list of flashcards for the authenticated user
   *
   * @param params - Query parameters for pagination and sorting
   * @param params.userId - The ID of the user whose flashcards to retrieve
   * @param params.page - Page number (1-indexed)
   * @param params.limit - Number of items per page (max 100)
   * @param params.sort - Field to sort by (created_at, due_date, updated_at)
   * @param params.order - Sort direction (asc, desc)
   * @returns Paginated list of flashcards with metadata
   * @throws FlashcardServiceError if database operation fails
   */
  async listUserFlashcards(params: {
    userId: string;
    page: number;
    limit: number;
    sort: string;
    order: string;
  }): Promise<FlashcardListResponseDTO> {
    const { userId, page, limit, sort, order } = params;

    // Step 1: Get total count of flashcards for the user
    const { count, error: countError } = await this.supabase
      .from("flashcards")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    if (countError) {
      throw new FlashcardServiceError("Failed to count flashcards", "DATABASE_ERROR", countError);
    }

    const total = count ?? 0;

    // Step 2: Calculate pagination values
    const totalPages = Math.ceil(total / limit);

    // If page exceeds total pages and there are flashcards, return empty data
    // This is not an error, just an out-of-range page request
    if (page > totalPages && total > 0) {
      return {
        data: [],
        pagination: {
          page,
          limit,
          total,
          total_pages: totalPages,
        },
      };
    }

    // Step 3: Calculate range for pagination
    // Supabase uses 0-indexed ranges
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Step 4: Fetch flashcards with sorting and pagination
    const { data: flashcards, error: fetchError } = await this.supabase
      .from("flashcards")
      .select("*")
      .eq("user_id", userId)
      .order(sort, { ascending: order === "asc" })
      .range(from, to);

    if (fetchError) {
      throw new FlashcardServiceError("Failed to fetch flashcards", "DATABASE_ERROR", fetchError);
    }

    // Step 5: Return response with data and pagination metadata
    return {
      data: flashcards ?? [],
      pagination: {
        page,
        limit,
        total,
        total_pages: totalPages,
      },
    };
  }

  /**
   * Get flashcards due for review
   * Retrieves all flashcards for a user that are due for review based on SM-2 algorithm
   *
   * @param userId - The ID of the user whose flashcards to retrieve
   * @param date - The date to check against (ISO 8601 string). Defaults to current date/time if not provided.
   * @returns Array of due flashcards sorted by due_date (earliest first)
   * @throws FlashcardServiceError if database operation fails
   */
  async getDueFlashcards(userId: string, date?: string): Promise<StudyFlashcardDTO[]> {
    // Use provided date or default to current date/time
    const effectiveDate = date ?? new Date().toISOString();

    // Query database for flashcards due for review
    // Only select fields needed for StudyFlashcardDTO
    const { data: flashcards, error } = await this.supabase
      .from("flashcards")
      .select("id, front, back, interval, repetition, ease_factor, due_date")
      .eq("user_id", userId)
      .lte("due_date", effectiveDate)
      .order("due_date", { ascending: true });

    if (error) {
      throw new FlashcardServiceError("Failed to retrieve due flashcards from database", "DATABASE_ERROR", error);
    }

    // Return flashcards array (empty array if no flashcards due)
    return flashcards ?? [];
  }

  /**
   * Review a flashcard and calculate new SM-2 parameters
   * Updates flashcard based on user's quality rating (0-5)
   *
   * Implements the SM-2 spaced repetition algorithm:
   * - Quality < 3: Reset repetition to 0, set interval to 1 day
   * - Quality >= 3: Increase repetition, calculate interval based on ease factor
   * - Ease factor is adjusted based on quality (min: 1.3)
   *
   * @param flashcard - The current flashcard object with SM-2 parameters
   * @param quality - Quality rating from 0 to 5 (0=complete blackout, 5=perfect response)
   * @returns Updated SM-2 parameters (interval, repetition, ease_factor, due_date)
   */
  reviewFlashcard(
    flashcard: Flashcard,
    quality: SubmitReviewCommand["quality"]
  ): Pick<Flashcard, "interval" | "repetition" | "ease_factor" | "due_date"> {
    // Extract current SM-2 parameters
    let { interval, repetition, ease_factor } = flashcard;

    // Step 1: Update ease factor based on quality
    // Formula: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    // This adjusts the ease factor based on how well the user recalled the card
    ease_factor = ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

    // Ensure ease factor doesn't go below minimum threshold
    if (ease_factor < 1.3) {
      ease_factor = 1.3;
    }

    // Step 2: Calculate new interval and repetition based on quality
    if (quality < 3) {
      // Failed recall: Reset progress
      repetition = 0;
      interval = 1; // Review again tomorrow
    } else {
      // Successful recall: Increase repetition and calculate new interval
      repetition += 1;

      if (repetition === 1) {
        // First successful review: 1 day
        interval = 1;
      } else if (repetition === 2) {
        // Second successful review: 6 days
        interval = 6;
      } else {
        // Subsequent reviews: multiply previous interval by ease factor
        interval = Math.round(interval * ease_factor);
      }
    }

    // Step 3: Calculate due date based on new interval
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + interval);

    return {
      interval,
      repetition,
      ease_factor,
      due_date: dueDate.toISOString(),
    };
  }

  /**
   * Update flashcard SM-2 parameters after review
   * Updates the database with new SM-2 parameters calculated by the review algorithm
   * RLS ensures only the owner can update their flashcards
   *
   * @param flashcardId - The UUID of the flashcard to update
   * @param reviewParams - The updated SM-2 parameters
   * @returns The updated flashcard with new SM-2 parameters if found and updated, null otherwise
   * @throws FlashcardServiceError if database operation fails
   */
  async updateFlashcardAfterReview(
    flashcardId: string,
    reviewParams: Pick<Flashcard, "interval" | "repetition" | "ease_factor" | "due_date">
  ): Promise<ReviewResponseDTO | null> {
    const { interval, repetition, ease_factor, due_date } = reviewParams;

    // Update flashcard SM-2 parameters in database
    // RLS (Row Level Security) automatically filters by authenticated user
    // The update will only succeed if the flashcard belongs to the user
    const { data: updatedFlashcard, error } = await this.supabase
      .from("flashcards")
      .update({
        interval,
        repetition,
        ease_factor,
        due_date,
        updated_at: new Date().toISOString(),
      })
      .eq("id", flashcardId)
      .select("id, interval, repetition, ease_factor, due_date, updated_at")
      .single();

    if (error) {
      // If error code is PGRST116, it means no rows were found or updated
      // This happens when the flashcard doesn't exist or doesn't belong to the user
      if (error.code === "PGRST116") {
        return null;
      }

      // Any other error is a database error
      throw new FlashcardServiceError("Failed to update flashcard after review in database", "DATABASE_ERROR", error);
    }

    return updatedFlashcard;
  }
}
