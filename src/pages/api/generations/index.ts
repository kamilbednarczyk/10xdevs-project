import type { APIRoute } from "astro";
import { ZodError } from "zod";

import { CreateGenerationSchema } from "../../../lib/schemas/generation.schema";
import { GenerationService, GenerationServiceError } from "../../../lib/services/generation.service";
import type { ErrorResponseDTO, GenerationResponseDTO } from "../../../types";

export const prerender = false;

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
