import { z } from "zod";

/**
 * Validation schema for CreateGenerationCommand
 * Validates the request body for POST /api/generations
 */
export const CreateGenerationSchema = z.object({
  text: z
    .string()
    .min(1000, "Text must be at least 1000 characters long")
    .max(10000, "Text must not exceed 10000 characters"),
});

/**
 * Type inference from the schema
 */
export type CreateGenerationSchemaType = z.infer<typeof CreateGenerationSchema>;

/**
 * Validation schema for generation ID parameter
 * Validates the ID parameter for GET /api/generations/:id
 */
export const GenerationIdSchema = z.coerce
  .number()
  .int("ID must be an integer")
  .positive("ID must be a positive number");
