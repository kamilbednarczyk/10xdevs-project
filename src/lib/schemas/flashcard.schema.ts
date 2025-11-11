import { z } from "zod";

/**
 * Validation schema for CreateFlashcardCommand
 * Validates the request body for POST /api/flashcards
 * Only accepts manual flashcards (AI flashcards are created via batch endpoint)
 */
export const CreateFlashcardSchema = z.object({
  front: z.string().min(1, "Front side cannot be empty").max(200, "Front side must not exceed 200 characters"),
  back: z.string().min(1, "Back side cannot be empty").max(500, "Back side must not exceed 500 characters"),
  generation_type: z.literal("manual", {
    errorMap: () => ({
      message: "Only manual flashcards are supported. Use the batch endpoint for AI-generated flashcards.",
    }),
  }),
});

/**
 * Validation schema for a single flashcard item in batch creation
 * Validates individual flashcard data within the batch request
 */
export const FlashcardBatchItemSchema = z
  .object({
    front: z.string().min(1, "Front side cannot be empty").max(200, "Front side must not exceed 200 characters"),
    back: z.string().min(1, "Back side cannot be empty").max(500, "Back side must not exceed 500 characters"),
    generation_type: z.enum(["ai", "manual"], {
      errorMap: () => ({ message: "Generation type must be either 'ai' or 'manual'" }),
    }),
    generation_id: z.number().int().positive().nullable(),
  })
  .refine(
    (data) => {
      // If generation_type is "ai", generation_id must be a valid number
      if (data.generation_type === "ai") {
        return data.generation_id !== null;
      }
      // If generation_type is "manual", generation_id must be null
      if (data.generation_type === "manual") {
        return data.generation_id === null;
      }
      return true;
    },
    {
      message: "For 'ai' flashcards, generation_id is required. For 'manual' flashcards, generation_id must be null.",
      path: ["generation_id"],
    }
  );

/**
 * Validation schema for CreateFlashcardsBatchCommand
 * Validates the request body for POST /api/flashcards/batch
 */
export const CreateFlashcardsBatchSchema = z.object({
  flashcards: z
    .array(FlashcardBatchItemSchema)
    .min(1, "At least one flashcard is required")
    .max(100, "Cannot create more than 100 flashcards in a single batch"),
});

/**
 * Type inference from the schemas
 */
export type CreateFlashcardSchemaType = z.infer<typeof CreateFlashcardSchema>;
export type FlashcardBatchItemSchemaType = z.infer<typeof FlashcardBatchItemSchema>;
export type CreateFlashcardsBatchSchemaType = z.infer<typeof CreateFlashcardsBatchSchema>;
