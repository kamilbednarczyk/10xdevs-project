import type { APIRoute } from "astro";
import { ZodError } from "zod";

import { UuidSchema } from "../../../lib/schemas/common.schema";
import { UpdateFlashcardSchema } from "../../../lib/schemas/flashcard.schema";
import { FlashcardService, FlashcardServiceError } from "../../../lib/services/flashcard.service";
import type { ErrorResponseDTO, FlashcardResponseDTO, UpdateFlashcardCommand } from "../../../types";

export const prerender = false;

/**
 * GET /api/flashcards/:id
 * Retrieve a single flashcard by ID
 *
 * URL Parameters: id (UUID)
 * Success response (200): FlashcardResponseDTO
 * Error responses: ErrorResponseDTO
 *
 * This endpoint allows users to retrieve detailed information about a specific flashcard.
 * The flashcard must belong to the authenticated user (authorization check via user_id).
 */
export const GET: APIRoute = async ({ params, locals }) => {
  try {
    // Step 1: Verify user authentication
    // Middleware handles authentication and sets up locals.supabase with user context
    // RLS policies on the database ensure users can only access their own flashcards
    if (!locals.user) {
      return new Response(
        JSON.stringify({
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required. Please log in to access flashcards.",
          },
        } satisfies ErrorResponseDTO),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

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

    // Step 3: Call FlashcardService to retrieve the flashcard
    const flashcardService = new FlashcardService(locals.supabase);

    let flashcard: FlashcardResponseDTO | null;
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
      console.error("Unexpected error in GET /api/flashcards/:id:", error);
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

    // Step 4: Check if flashcard was found
    if (!flashcard) {
      return new Response(
        JSON.stringify({
          error: {
            code: "NOT_FOUND",
            message: "Flashcard not found or you do not have permission to access it",
          },
        } satisfies ErrorResponseDTO),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 5: Return success response
    return new Response(JSON.stringify(flashcard), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Catch-all for any unhandled errors
    // eslint-disable-next-line no-console
    console.error("Critical error in GET /api/flashcards/:id:", error);
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

/**
 * PUT /api/flashcards/:id
 * Update a flashcard's content (front and back)
 *
 * URL Parameters: id (UUID)
 * Request Body: UpdateFlashcardCommand (front, back)
 * Success response (200): FlashcardResponseDTO
 * Error responses: ErrorResponseDTO
 *
 * This endpoint allows users to update the content of their flashcards.
 * Only front and back fields can be updated. SM-2 parameters are updated via the review endpoint.
 * RLS ensures users can only update their own flashcards.
 */
export const PUT: APIRoute = async ({ params, request, locals }) => {
  try {
    // Step 1: Verify user authentication
    // Middleware handles authentication and sets up locals.supabase with user context
    // RLS policies on the database ensure users can only update their own flashcards
    if (!locals.user) {
      return new Response(
        JSON.stringify({
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required. Please log in to update flashcards.",
          },
        } satisfies ErrorResponseDTO),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

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
    let validatedData: UpdateFlashcardCommand;
    try {
      validatedData = UpdateFlashcardSchema.parse(requestBody);
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

    // Step 5: Call FlashcardService to update the flashcard
    const flashcardService = new FlashcardService(locals.supabase);

    let updatedFlashcard: FlashcardResponseDTO | null;
    try {
      updatedFlashcard = await flashcardService.updateFlashcard(flashcardId, validatedData);
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
      console.error("Unexpected error in PUT /api/flashcards/:id:", error);
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

    // Step 6: Check if flashcard was found and updated
    if (!updatedFlashcard) {
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

    // Step 7: Return success response with updated flashcard
    return new Response(JSON.stringify(updatedFlashcard), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Catch-all for any unhandled errors
    // eslint-disable-next-line no-console
    console.error("Critical error in PUT /api/flashcards/:id:", error);
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

/**
 * DELETE /api/flashcards/:id
 * Delete a flashcard permanently
 *
 * URL Parameters: id (UUID)
 * Request Body: None
 * Success response (204): No Content
 * Error responses: ErrorResponseDTO
 *
 * This endpoint allows users to permanently delete their flashcards.
 * RLS ensures users can only delete their own flashcards.
 */
export const DELETE: APIRoute = async ({ params, locals }) => {
  try {
    // Step 1: Verify user authentication
    // Middleware handles authentication and sets up locals.supabase with user context
    // RLS policies on the database ensure users can only delete their own flashcards
    if (!locals.user) {
      return new Response(
        JSON.stringify({
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required. Please log in to delete flashcards.",
          },
        } satisfies ErrorResponseDTO),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

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

    // Step 3: Call FlashcardService to delete the flashcard
    const flashcardService = new FlashcardService(locals.supabase);

    let deleted: boolean;
    try {
      deleted = await flashcardService.deleteFlashcard(flashcardId);
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
      console.error("Unexpected error in DELETE /api/flashcards/:id:", error);
      return new Response(
        JSON.stringify({
          error: {
            code: "INTERNAL_ERROR",
            message: "An unexpected error occurred while deleting the flashcard",
            details: { error: error instanceof Error ? error.message : String(error) },
          },
        } satisfies ErrorResponseDTO),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 4: Check if flashcard was found and deleted
    if (!deleted) {
      return new Response(
        JSON.stringify({
          error: {
            code: "NOT_FOUND",
            message: "Flashcard not found or you do not have permission to delete it",
          },
        } satisfies ErrorResponseDTO),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 5: Return success response (204 No Content)
    return new Response(null, {
      status: 204,
    });
  } catch (error) {
    // Catch-all for any unhandled errors
    // eslint-disable-next-line no-console
    console.error("Critical error in DELETE /api/flashcards/:id:", error);
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
