import type { APIRoute } from "astro";
import { ZodError } from "zod";

import { UuidSchema } from "../../../../lib/schemas/common.schema";
import { SubmitReviewSchema } from "../../../../lib/schemas/study.schema";
import { FlashcardService, FlashcardServiceError } from "../../../../lib/services/flashcard.service";
import type { ErrorResponseDTO, ReviewResponseDTO, SubmitReviewCommand } from "../../../../types";

export const prerender = false;

/**
 * POST /api/flashcards/:id/review
 * Submit a review for a flashcard and update SM-2 parameters
 *
 * URL Parameters: id (UUID)
 * Request Body: SubmitReviewCommand (quality: 0-5)
 * Success response (200): ReviewResponseDTO
 * Error responses: ErrorResponseDTO
 *
 * This endpoint processes user's review of a flashcard. It calculates new SM-2
 * parameters based on the quality rating and updates the flashcard in the database.
 * RLS ensures users can only review their own flashcards.
 */
export const POST: APIRoute = async ({ params, request, locals }) => {
  try {
    // Step 1: Verify user authentication
    // Middleware handles authentication and sets up locals.supabase with user context
    // RLS policies on the database ensure users can only access their own flashcards
    // const {
    //   data: { session },
    //   error: sessionError,
    // } = await locals.supabase.auth.getSession();

    // if (sessionError || !session) {
    //   return new Response(
    //     JSON.stringify({
    //       error: {
    //         code: "UNAUTHORIZED",
    //         message: "Authentication required. Please log in to review flashcards.",
    //         details: sessionError ? { error: sessionError } : undefined,
    //       },
    //     } satisfies ErrorResponseDTO),
    //     {
    //       status: 401,
    //       headers: { "Content-Type": "application/json" },
    //     }
    //   );
    // }

    // Step 2: Validate flashcard ID parameter
    if (!params.id) {
      return new Response(
        JSON.stringify({
          error: {
            code: "VALIDATION_ERROR",
            message: "Flashcard ID is required",
          },
        } satisfies ErrorResponseDTO),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    let flashcardId: string;
    try {
      flashcardId = UuidSchema.parse(params.id);
    } catch (error) {
      if (error instanceof ZodError) {
        return new Response(
          JSON.stringify({
            error: {
              code: "VALIDATION_ERROR",
              message: "Invalid flashcard ID format. Expected a valid UUID.",
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

    // Step 3: Parse and validate request body
    let requestBody: unknown;
    try {
      requestBody = await request.json();
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
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 4: Validate request body against schema
    let validatedData: SubmitReviewCommand;
    try {
      validatedData = SubmitReviewSchema.parse(requestBody);
    } catch (error) {
      if (error instanceof ZodError) {
        return new Response(
          JSON.stringify({
            error: {
              code: "VALIDATION_ERROR",
              message: "Request body validation failed",
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

    // Step 5: Retrieve the flashcard from database
    const flashcardService = new FlashcardService(locals.supabase);

    let flashcard;
    try {
      flashcard = await flashcardService.getFlashcardById(flashcardId);
    } catch (error) {
      if (error instanceof FlashcardServiceError) {
        // Map service error codes to HTTP status codes
        let statusCode: number;
        switch (error.code) {
          case "NOT_FOUND":
            statusCode = 404;
            break;
          case "FORBIDDEN":
            statusCode = 403;
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
      console.error("Unexpected error in POST /api/flashcards/:id/review (retrieve flashcard):", error);
      return new Response(
        JSON.stringify({
          error: {
            code: "INTERNAL_ERROR",
            message: "An unexpected error occurred while retrieving the flashcard",
            details: { error: error instanceof Error ? error.message : String(error) },
          },
        } satisfies ErrorResponseDTO),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 6: Check if flashcard was found
    if (!flashcard) {
      return new Response(
        JSON.stringify({
          error: {
            code: "NOT_FOUND",
            message: "Flashcard not found or you do not have permission to review it",
          },
        } satisfies ErrorResponseDTO),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 7: Calculate new SM-2 parameters using the review algorithm
    const updatedParams = flashcardService.reviewFlashcard(flashcard, validatedData.quality);

    // Step 8: Update the flashcard in the database with new SM-2 parameters
    let reviewResponse: ReviewResponseDTO | null;
    try {
      reviewResponse = await flashcardService.updateFlashcardAfterReview(flashcardId, updatedParams);
    } catch (error) {
      if (error instanceof FlashcardServiceError) {
        // Map service error codes to HTTP status codes
        let statusCode: number;
        switch (error.code) {
          case "NOT_FOUND":
            statusCode = 404;
            break;
          case "FORBIDDEN":
            statusCode = 403;
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
      console.error("Unexpected error in POST /api/flashcards/:id/review (update flashcard):", error);
      return new Response(
        JSON.stringify({
          error: {
            code: "INTERNAL_ERROR",
            message: "An unexpected error occurred while updating the flashcard",
            details: { error: error instanceof Error ? error.message : String(error) },
          },
        } satisfies ErrorResponseDTO),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 9: Check if flashcard was updated successfully
    if (!reviewResponse) {
      return new Response(
        JSON.stringify({
          error: {
            code: "NOT_FOUND",
            message: "Flashcard not found or you do not have permission to update it",
          },
        } satisfies ErrorResponseDTO),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 10: Return success response with updated SM-2 parameters
    return new Response(JSON.stringify(reviewResponse), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Catch-all for any unhandled errors
    // eslint-disable-next-line no-console
    console.error("Critical error in POST /api/flashcards/:id/review:", error);
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
