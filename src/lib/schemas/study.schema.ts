import { z } from "zod";

/**
 * Validation schema for GET /api/study/due query parameters
 * Validates the optional date parameter for filtering due flashcards
 */
export const GetDueFlashcardsQuerySchema = z.object({
  date: z.string().datetime({ message: "Date must be a valid ISO 8601 datetime string" }).optional(),
});

/**
 * Validation schema for SubmitReviewCommand
 * Validates the request body for POST /api/flashcards/:id/review
 * Quality scale (0-5) for SM-2 spaced repetition algorithm:
 * - 0: Complete blackout
 * - 1: Incorrect, but familiar
 * - 2: Incorrect, but easy to recall
 * - 3: Correct with significant effort
 * - 4: Correct with hesitation
 * - 5: Perfect response
 */
export const SubmitReviewSchema = z.object({
  quality: z
    .number()
    .int({ message: "Quality must be an integer" })
    .min(0, { message: "Quality must be at least 0" })
    .max(5, { message: "Quality must be at most 5" })
    .refine((val): val is 0 | 1 | 2 | 3 | 4 | 5 => val >= 0 && val <= 5, {
      message: "Quality must be between 0 and 5",
    }),
});

/**
 * Type inference from the schemas
 */
export type GetDueFlashcardsQuerySchemaType = z.infer<typeof GetDueFlashcardsQuerySchema>;
export type SubmitReviewSchemaType = z.infer<typeof SubmitReviewSchema>;
