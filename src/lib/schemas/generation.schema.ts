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

/**
 * Validation schema for GET /api/generations query parameters
 * Validates pagination parameters for listing generations
 */
export const ListGenerationsQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .default("1")
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive({ message: "Page must be a positive integer" })),
  limit: z
    .string()
    .optional()
    .default("20")
    .transform((val) => parseInt(val, 10))
    .pipe(
      z
        .number()
        .int()
        .positive({ message: "Limit must be a positive integer" })
        .max(50, { message: "Limit cannot exceed 50" })
    ),
});

/**
 * Type inference from the schemas
 */
export type ListGenerationsQuerySchemaType = z.infer<typeof ListGenerationsQuerySchema>;
