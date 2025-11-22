import type { APIRoute } from "astro";
import { ZodError } from "zod";

import { CreateFlashcardsBatchSchema } from "../../../lib/schemas/flashcard.schema";
import { FlashcardService, FlashcardServiceError } from "../../../lib/services/flashcard.service";
import type { ErrorResponseDTO, FlashcardsBatchResponseDTO } from "../../../types";

export const prerender = false;

/**
 * POST /api/flashcards/batch
 * Create multiple flashcards in a batch operation
 *
 * Request body: CreateFlashcardsBatchCommand
 * Success response (201): FlashcardsBatchResponseDTO
 * Error responses: ErrorResponseDTO
 *
 * This endpoint supports both manual and AI-generated flashcards.
 * For AI flashcards, it atomically updates the accepted_count in the
 * associated generation record.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Step 1: Verify user authentication
    // const {
    //   data: { session },
    //   error: sessionError,
    // } = await locals.supabase.auth.getSession();

    // if (sessionError || !session) {
    //   return new Response(
    //     JSON.stringify({
    //       error: {
    //         code: "UNAUTHORIZED",
    //         message: "Authentication required. Please log in to create flashcards.",
    //         details: sessionError ? { error: sessionError } : undefined,
    //       },
    //     } satisfies ErrorResponseDTO),
    //     {
    //       status: 401,
    //       headers: { "Content-Type": "application/json" },
    //     }
    //   );
    // }

    // const userId = session.user.id;
    const userId = "79eb5373-0acf-479e-8777-d799cb1739ca";

    // Step 2: Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid JSON in request body",
            details: { error: error instanceof Error ? error.message : String(error) },
          },
        } satisfies ErrorResponseDTO),
        {
          status: 422,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 3: Validate request body
    let validatedData: {
      flashcards: {
        front: string;
        back: string;
        generation_type: "ai" | "manual";
        generation_id: number | null;
      }[];
    };
    try {
      validatedData = CreateFlashcardsBatchSchema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        return new Response(
          JSON.stringify({
            error: {
              code: "VALIDATION_ERROR",
              message: "Request validation failed",
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

    // Step 4: Call FlashcardService
    const flashcardService = new FlashcardService(locals.supabase);

    let createdFlashcards;
    try {
      createdFlashcards = await flashcardService.createFlashcardsBatch(validatedData, userId);
    } catch (error) {
      if (error instanceof FlashcardServiceError) {
        // Map service error codes to HTTP status codes
        let statusCode: number;
        switch (error.code) {
          case "NOT_FOUND":
            statusCode = 404;
            break;
          case "FORBIDDEN":
            statusCode = 400; // Using 400 as per plan, could also be 403
            break;
          case "VALIDATION_ERROR":
            statusCode = 400;
            break;
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
              details: error.details,
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
      console.error("Unexpected error in POST /api/flashcards/batch:", error);
      return new Response(
        JSON.stringify({
          error: {
            code: "INTERNAL_ERROR",
            message: "An unexpected error occurred while creating flashcards",
            details: { error: error instanceof Error ? error.message : String(error) },
          },
        } satisfies ErrorResponseDTO),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 5: Return success response
    const response: FlashcardsBatchResponseDTO = {
      created_count: createdFlashcards.length,
      flashcards: createdFlashcards,
    };

    return new Response(JSON.stringify(response), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Catch-all for any unhandled errors
    // eslint-disable-next-line no-console
    console.error("Critical error in POST /api/flashcards/batch:", error);
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
