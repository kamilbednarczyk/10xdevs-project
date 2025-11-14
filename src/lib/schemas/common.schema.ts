import { z } from "zod";

/**
 * Common validation schemas used across the application
 */

/**
 * UUID validation schema
 * Validates that a string is a valid UUID format
 */
export const UuidSchema = z.string().uuid({
  message: "Invalid UUID format",
});

/**
 * Type inference from the schema
 */
export type UuidSchemaType = z.infer<typeof UuidSchema>;
