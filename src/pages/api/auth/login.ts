import type { APIRoute } from "astro";

import { createSupabaseServerInstance } from "../../../db/supabase.client.ts";
import { LoginSchema } from "@/lib/schemas/auth.schema";

export const prerender = false;

const jsonResponse = (body: Record<string, unknown>, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return jsonResponse(
      {
        error: "INVALID_BODY",
        message: "Nieprawidłowe dane żądania.",
      },
      400
    );
  }

  const parsed = LoginSchema.safeParse(payload);

  if (!parsed.success) {
    return jsonResponse(
      {
        error: "VALIDATION_ERROR",
        message: parsed.error.errors[0]?.message ?? "Podaj poprawny email i hasło.",
      },
      400
    );
  }

  const supabase = createSupabaseServerInstance({
    cookies,
    headers: request.headers,
    runtimeEnv: locals.runtime?.env,
  });
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return jsonResponse(
      {
        error: "AUTH_ERROR",
        message: error.message,
      },
      400
    );
  }

  return jsonResponse({ user: data.user }, 200);
};
