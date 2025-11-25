import type { APIContext } from "astro";
import { GenerationService } from "../../../lib/services/generation.service";
import { GenerationIdSchema } from "../../../lib/schemas/generation.schema";
import type { GenerationDetailResponseDTO, ErrorResponseDTO } from "../../../types";

export const prerender = false;

/**
 * GET /api/generations/:id
 * Retrieves detailed information about a specific generation session
 *
 * @param params.id - The generation ID to retrieve
 * @returns 200 with generation details, 400 for invalid ID, 404 if not found, 401 if unauthorized, 500 on error
 */
export async function GET({ params, locals }: APIContext): Promise<Response> {
  try {
    // Step 1: Check authentication
    const user = locals.user;
    if (!user) {
      const errorResponse: ErrorResponseDTO = {
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required to access this resource",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Step 2: Validate the ID parameter
    const validationResult = GenerationIdSchema.safeParse(params.id);
    if (!validationResult.success) {
      const errorResponse: ErrorResponseDTO = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid generation ID",
          details: validationResult.error.flatten(),
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const generationId = validationResult.data;

    // Step 3: Get Supabase client from locals
    const supabase = locals.supabase;
    if (!supabase) {
      const errorResponse: ErrorResponseDTO = {
        error: {
          code: "INTERNAL_ERROR",
          message: "Database connection not available",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Step 4: Fetch generation from service
    const generationService = new GenerationService(supabase);
    const generation = await generationService.getGenerationById(generationId);

    // Step 5: Handle not found case
    if (!generation) {
      const errorResponse: ErrorResponseDTO = {
        error: {
          code: "NOT_FOUND",
          message: `Generation with ID ${generationId} not found`,
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Step 6: Return success response
    const response: GenerationDetailResponseDTO = generation;
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Step 7: Handle unexpected errors
    const errorResponse: ErrorResponseDTO = {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred while fetching the generation",
        details: error instanceof Error ? { message: error.message } : undefined,
      },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
