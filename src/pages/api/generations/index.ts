import type { APIRoute } from "astro";
import { ZodError } from "zod";

import { CreateGenerationSchema, ListGenerationsQuerySchema } from "../../../lib/schemas/generation.schema";
import { GenerationService, GenerationServiceError } from "../../../lib/services/generation.service";
import type { ErrorResponseDTO, GenerationResponseDTO, GenerationListResponseDTO } from "../../../types";

export const prerender = false;

/**
 * GET /api/generations
 * List all generation sessions for the authenticated user with pagination
 *
 * Query parameters: page, limit (both optional)
 * Success response (200): GenerationListResponseDTO
 * Error responses: ErrorResponseDTO
 *
 * This endpoint retrieves a paginated list of generation sessions belonging to the authenticated user.
 * Each generation includes computed acceptance_rate (accepted_count / generated_count).
 */
export const GET: APIRoute = async ({ url, locals }) => {
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
    //         message: "Authentication required. Please log in to view generations.",
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

    // Step 2: Extract and validate query parameters
    const queryParams = {
      page: url.searchParams.get("page") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
    };

    let validatedParams: {
      page: number;
      limit: number;
    };

    try {
      validatedParams = ListGenerationsQuerySchema.parse(queryParams);
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

    // Step 3: Call GenerationService to retrieve generations
    const generationService = new GenerationService(locals.supabase);

    let response: GenerationListResponseDTO;
    try {
      response = await generationService.listUserGenerations(userId, validatedParams.page, validatedParams.limit);
    } catch (error) {
      if (error instanceof GenerationServiceError) {
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
      console.error("Unexpected error in GET /api/generations:", error);
      return new Response(
        JSON.stringify({
          error: {
            code: "INTERNAL_ERROR",
            message: "An unexpected error occurred while retrieving generations",
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
    console.error("Critical error in GET /api/generations:", error);
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
 * POST /api/generations
 * Generate flashcard proposals from text using AI
 *
 * Request body: CreateGenerationCommand
 * Success response (201): GenerationResponseDTO
 * Error responses: ErrorResponseDTO
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Step 1: Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid JSON in request body",
            details: { error },
          },
        } satisfies ErrorResponseDTO),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 2: Validate request body
    let validatedData: { text: string };
    try {
      validatedData = CreateGenerationSchema.parse(body);
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
            details: { error },
          },
        } satisfies ErrorResponseDTO),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 3: Call GenerationService
    const generationService = new GenerationService(locals.supabase);

    let result: GenerationResponseDTO;
    try {
      result = await generationService.generateFromText(validatedData.text);
    } catch (error) {
      if (error instanceof GenerationServiceError) {
        // Map service error codes to HTTP status codes
        let statusCode: number;
        switch (error.code) {
          case "AI_SERVICE_ERROR":
            statusCode = 503; // Service Unavailable
            break;
          case "DATABASE_ERROR":
            statusCode = 500; // Internal Server Error
            break;
          case "INTERNAL_ERROR":
            statusCode = 500; // Internal Server Error
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
      console.error("Unexpected error in POST /api/generations:", error);
      return new Response(
        JSON.stringify({
          error: {
            code: "INTERNAL_ERROR",
            message: "An unexpected error occurred",
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
    return new Response(JSON.stringify(result), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Catch-all for any unhandled errors
    // eslint-disable-next-line no-console
    console.error("Critical error in POST /api/generations:", error);
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
