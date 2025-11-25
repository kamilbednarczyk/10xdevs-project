import type { APIRoute } from "astro";
import { ZodError } from "zod";

import { CreateFlashcardSchema, ListFlashcardsQuerySchema } from "../../../lib/schemas/flashcard.schema";
import { FlashcardService, FlashcardServiceError } from "../../../lib/services/flashcard.service";
import type { ErrorResponseDTO, FlashcardResponseDTO, FlashcardListResponseDTO } from "../../../types";

export const prerender = false;

/**
 * GET /api/flashcards
 * List all flashcards for the authenticated user with pagination and sorting
 *
 * Query parameters: page, limit, sort, order (all optional)
 * Success response (200): FlashcardListResponseDTO
 * Error responses: ErrorResponseDTO
 *
 * This endpoint retrieves a paginated list of flashcards belonging to the authenticated user.
 * Supports sorting by created_at, due_date, or updated_at in ascending or descending order.
 */
export const GET: APIRoute = async ({ url, locals }) => {
  try {
    // Step 1: Verify user authentication
    if (!locals.user) {
      return new Response(
        JSON.stringify({
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required. Please log in to view flashcards.",
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
      page: url.searchParams.get("page") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
      sort: url.searchParams.get("sort") ?? undefined,
      order: url.searchParams.get("order") ?? undefined,
    };

    let validatedParams: {
      page: number;
      limit: number;
      sort: string;
      order: string;
    };

    try {
      validatedParams = ListFlashcardsQuerySchema.parse(queryParams);
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

    // Step 3: Call FlashcardService to retrieve flashcards
    const flashcardService = new FlashcardService(locals.supabase);

    let response: FlashcardListResponseDTO;
    try {
      response = await flashcardService.listUserFlashcards({
        userId,
        page: validatedParams.page,
        limit: validatedParams.limit,
        sort: validatedParams.sort,
        order: validatedParams.order,
      });
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
      console.error("Unexpected error in GET /api/flashcards:", error);
      return new Response(
        JSON.stringify({
          error: {
            code: "INTERNAL_ERROR",
            message: "An unexpected error occurred while retrieving flashcards",
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
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Catch-all for any unhandled errors
    // eslint-disable-next-line no-console
    console.error("Critical error in GET /api/flashcards:", error);
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
 * POST /api/flashcards
 * Create a single flashcard
 *
 * Request body: CreateFlashcardCommand
 * Success response (201): FlashcardResponseDTO
 * Error responses: ErrorResponseDTO
 *
 * This endpoint allows users to create a new flashcard manually.
 * The flashcard is initialized with SM-2 algorithm default values.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Step 1: Verify user authentication
    if (!locals.user) {
      return new Response(
        JSON.stringify({
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required. Please log in to create a flashcard.",
          },
        } satisfies ErrorResponseDTO),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const userId = locals.user.id;

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
      front: string;
      back: string;
      generation_type: "manual";
    };
    try {
      validatedData = CreateFlashcardSchema.parse(body);
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

    let createdFlashcard: FlashcardResponseDTO;
    try {
      createdFlashcard = await flashcardService.createFlashcard(validatedData, userId);
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
      console.error("Unexpected error in POST /api/flashcards:", error);
      return new Response(
        JSON.stringify({
          error: {
            code: "INTERNAL_ERROR",
            message: "An unexpected error occurred while creating the flashcard",
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
    return new Response(JSON.stringify(createdFlashcard), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Catch-all for any unhandled errors
    // eslint-disable-next-line no-console
    console.error("Critical error in POST /api/flashcards:", error);
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
