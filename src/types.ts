/**
 * DTO (Data Transfer Object) and Command Model Types
 *
 * This file contains all types used for API requests and responses.
 * All types are derived from database entity types to ensure type safety.
 */

import type { Tables } from "./db/database.types";

// ============================================================================
// Base Entity Types (Re-exported for convenience)
// ============================================================================

export type Flashcard = Tables<"flashcards">;
export type Generation = Tables<"generations">;

// ============================================================================
// Common/Shared Types
// ============================================================================

/**
 * Standard pagination metadata for list endpoints
 */
export interface PaginationDTO {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

/**
 * AI-generated flashcard proposal (not yet saved to database)
 */
export interface FlashcardProposalDTO {
  front: string;
  back: string;
}

// ============================================================================
// Flashcards Resource - Response DTOs
// ============================================================================

/**
 * Single flashcard response (used by GET, POST, PUT endpoints)
 * Maps directly to database Row type
 */
export type FlashcardResponseDTO = Flashcard;

/**
 * List of flashcards with pagination
 * Used by: GET /api/flashcards
 */
export interface FlashcardListResponseDTO {
  data: FlashcardResponseDTO[];
  pagination: PaginationDTO;
}

/**
 * Batch creation response
 * Used by: POST /api/flashcards/batch
 */
export interface FlashcardsBatchResponseDTO {
  created_count: number;
  flashcards: FlashcardResponseDTO[];
}

// ============================================================================
// Flashcards Resource - Command Models (Request DTOs)
// ============================================================================

/**
 * Create a single flashcard
 * Used by: POST /api/flashcards
 *
 * Only accepts manual flashcards. AI-generated flashcards should use the batch endpoint.
 * Only includes user-provided fields. Server sets:
 * - id, user_id, created_at, updated_at (auto)
 * - interval, repetition, ease_factor, due_date (SM-2 defaults)
 * - generation_id (null for manual flashcards)
 */
export interface CreateFlashcardCommand {
  front: string;
  back: string;
  generation_type: "manual";
}

/**
 * Individual flashcard data for batch creation
 */
export interface FlashcardBatchItemCommand {
  front: string;
  back: string;
  generation_type: "ai" | "manual";
  generation_id: number | null;
}

/**
 * Create multiple flashcards in batch
 * Used by: POST /api/flashcards/batch
 */
export interface CreateFlashcardsBatchCommand {
  flashcards: FlashcardBatchItemCommand[];
}

/**
 * Update flashcard content
 * Used by: PUT /api/flashcards/:id
 *
 * Only allows updating front/back content.
 * SM-2 parameters are updated via review endpoint.
 */
export interface UpdateFlashcardCommand {
  front: string;
  back: string;
}

// ============================================================================
// Generations Resource - Response DTOs
// ============================================================================

/**
 * AI generation session result with proposals
 * Used by: POST /api/generations
 */
export interface GenerationResponseDTO {
  generation_id: number;
  generated_count: number;
  proposals: FlashcardProposalDTO[];
}

/**
 * Detailed generation record
 * Used by: GET /api/generations/:id
 * Maps directly to database Row type
 */
export type GenerationDetailResponseDTO = Generation;

/**
 * Generation list item with computed acceptance_rate
 * Used by: GET /api/generations (list endpoint)
 */
export interface GenerationListItemDTO {
  id: number;
  generated_count: number;
  accepted_count: number | null;
  acceptance_rate: number; // Computed: accepted_count / generated_count
  created_at: string;
  updated_at: string;
}

/**
 * List of generations with pagination
 * Used by: GET /api/generations
 */
export interface GenerationListResponseDTO {
  data: GenerationListItemDTO[];
  pagination: PaginationDTO;
}

// ============================================================================
// Generations Resource - Command Models (Request DTOs)
// ============================================================================

/**
 * Submit text for AI flashcard generation
 * Used by: POST /api/generations
 */
export interface CreateGenerationCommand {
  text: string;
}

// ============================================================================
// Study Resource - Response DTOs
// ============================================================================

/**
 * Flashcard data for study session (subset of full flashcard)
 * Excludes user_id, created_at, updated_at for cleaner response
 */
export type StudyFlashcardDTO = Pick<
  Flashcard,
  "id" | "front" | "back" | "interval" | "repetition" | "ease_factor" | "due_date"
>;

/**
 * Updated SM-2 parameters after review
 * Used by: POST /api/flashcards/:id/review
 */
export type ReviewResponseDTO = Pick<
  Flashcard,
  "id" | "interval" | "repetition" | "ease_factor" | "due_date" | "updated_at"
>;

// ============================================================================
// Study Resource - Command Models (Request DTOs)
// ============================================================================

/**
 * Submit review quality rating (SM-2 algorithm)
 * Used by: POST /api/flashcards/:id/review
 *
 * Quality scale (0-5):
 * - 0: Complete blackout
 * - 1: Incorrect, but familiar
 * - 2: Incorrect, but easy to recall
 * - 3: Correct with significant effort
 * - 4: Correct with hesitation
 * - 5: Perfect response
 */
export interface SubmitReviewCommand {
  quality: 0 | 1 | 2 | 3 | 4 | 5;
}

/**
 * Study view specific flashcard model
 * Mirrors StudyFlashcardDTO but kept separate for easier refactors on the UI layer
 */
export type StudyFlashcardViewModel = StudyFlashcardDTO;

/**
 * Supported statuses for the Study Session view state machine
 */
export type StudySessionStatus = "loading" | "in_progress" | "submitting" | "ended" | "error";

/**
 * Main view model for the Study Session UI
 */
export interface StudySessionViewModel {
  flashcards: StudyFlashcardViewModel[];
  currentCardIndex: number;
  isAnswerRevealed: boolean;
  sessionStatus: StudySessionStatus;
  errorMessage?: string;
}

// ============================================================================
// Error Response Types
// ============================================================================

/**
 * Standard error response format for all endpoints
 */
export interface ErrorResponseDTO {
  error: {
    code:
      | "VALIDATION_ERROR"
      | "NOT_FOUND"
      | "UNAUTHORIZED"
      | "FORBIDDEN"
      | "AI_SERVICE_ERROR"
      | "DATABASE_ERROR"
      | "INTERNAL_ERROR";
    message: string;
    details?: Record<string, unknown>;
  };
}

// ============================================================================
// Type Guards and Validators
// ============================================================================

/**
 * Type guard to check if quality is valid SM-2 rating
 */
export function isValidQuality(value: unknown): value is SubmitReviewCommand["quality"] {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 5;
}

/**
 * Type guard to check if generation_type is valid
 */
export function isValidGenerationType(value: unknown): value is "manual" | "ai" {
  return value === "manual" || value === "ai";
}
