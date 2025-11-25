import type { APIRoute } from "astro";
import { ZodError } from "zod";

import { GetDueFlashcardsQuerySchema } from "../../../lib/schemas/study.schema";
import { FlashcardService, FlashcardServiceError } from "../../../lib/services/flashcard.service";
import type { ErrorResponseDTO, StudyFlashcardDTO } from "../../../types";

export const prerender = false;

/**
 * GET /api/study/due
 * Retrieve flashcards due for review for the authenticated user
 *
 * Query parameters: date (optional, ISO 8601 format)
 * Success response (200): StudyFlashcardDTO[]
 * Error responses: ErrorResponseDTO
 *
 * This endpoint retrieves all flashcards that are due for review based on the SM-2 algorithm.
 * Flashcards are filtered by due_date <= effectiveDate and sorted by due_date (ascending).
 * If no date parameter is provided, the current server time is used.
 */
export const GET: APIRoute = async ({ url, locals }) => {
  try {
    // Step 1: Verify user authentication
    if (!locals.user) {
      return new Response(
        JSON.stringify({
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required. Please log in to view due flashcards.",
          },
        } satisfies ErrorResponseDTO),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const userId = locals.user.id;

    // Step 2: Extract and validate query parameters
    const queryParams = {
      date: url.searchParams.get("date") ?? undefined,
    };

    let validatedParams: {
      date?: string;
    };

    try {
      validatedParams = GetDueFlashcardsQuerySchema.parse(queryParams);
    } catch (error) {
      if (error instanceof ZodError) {
        return new Response(
          JSON.stringify({
            error: {
              code: "VALIDATION_ERROR",
              message: "Invalid query parameters",
              details: { issues: error.errors },
            },
          } satisfies ErrorResponseDTO),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Unexpected validation error
      return new Response(
        JSON.stringify({
          error: {
            code: "INTERNAL_ERROR",
            message: "Unexpected validation error",
            details: { error: error instanceof Error ? error.message : String(error) },
          },
        } satisfies ErrorResponseDTO),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 3: Call FlashcardService to retrieve due flashcards
    const flashcardService = new FlashcardService(locals.supabase);

    let dueFlashcards: StudyFlashcardDTO[];
    try {
      dueFlashcards = await flashcardService.getDueFlashcards(userId, validatedParams.date);
    } catch (error) {
      if (error instanceof FlashcardServiceError) {
        // Map service error codes to HTTP status codes
        let statusCode: number;
        switch (error.code) {
          case "DATABASE_ERROR":
            statusCode = 500;
            break;
          case "INTERNAL_ERROR":
            statusCode = 500;
            break;
          default:
            statusCode = 500;
        }

        return new Response(
          JSON.stringify({
            error: {
              code: error.code,
              message: error.message,
              details: error.details as Record<string, unknown> | undefined,
            },
          } satisfies ErrorResponseDTO),
          {
            status: statusCode,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Unexpected error
      // eslint-disable-next-line no-console
      console.error("Unexpected error in GET /api/study/due:", error);
      return new Response(
        JSON.stringify({
          error: {
            code: "INTERNAL_ERROR",
            message: "An unexpected error occurred while retrieving due flashcards",
            details: { error: error instanceof Error ? error.message : String(error) },
          },
        } satisfies ErrorResponseDTO),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 4: Return success response
    // Return the array of flashcards directly (not wrapped in an object)
    return new Response(JSON.stringify(dueFlashcards), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Catch-all for any unhandled errors
    // eslint-disable-next-line no-console
    console.error("Critical error in GET /api/study/due:", error);
    return new Response(
      JSON.stringify({
        error: {
          code: "INTERNAL_ERROR",
          message: "A critical error occurred",
          details: { error: error instanceof Error ? error.message : String(error) },
        },
      } satisfies ErrorResponseDTO),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
