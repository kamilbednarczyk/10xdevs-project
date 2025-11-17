import { z } from "zod";

/**
 * Validation schema for GET /api/study/due query parameters
 * Validates the optional date parameter for filtering due flashcards
 */
export const GetDueFlashcardsQuerySchema = z.object({
  date: z.string().datetime({ message: "Date must be a valid ISO 8601 datetime string" }).optional(),
});

/**
 * Type inference from the schema
 */
export type GetDueFlashcardsQuerySchemaType = z.infer<typeof GetDueFlashcardsQuerySchema>;
