import type { APIRoute } from "astro";

import { ResetPasswordSchema } from "@/lib/schemas/auth.schema";
import { createSupabaseServerInstance } from "../../../db/supabase.client.ts";

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

  const parsed = ResetPasswordSchema.safeParse(payload);

  if (!parsed.success) {
    return jsonResponse(
      {
        error: "VALIDATION_ERROR",
        message: parsed.error.errors[0]?.message ?? "Podaj poprawny adres email.",
      },
      400
    );
  }

  const supabase =
    locals.supabase ??
    createSupabaseServerInstance({
      cookies,
      headers: request.headers,
      runtimeEnv: locals.runtime?.env,
    });

  const redirectTo = new URL("/api/auth/callback", request.url);
  redirectTo.searchParams.set("next", "/auth/confirm");

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: redirectTo.toString(),
  });

  if (error) {
    return jsonResponse(
      {
        error: "AUTH_ERROR",
        message: "Nie mogliśmy wysłać instrukcji resetu hasła. Spróbuj ponownie za chwilę.",
      },
      500
    );
  }

  return jsonResponse(
    {
      message:
        "Jeżeli podany adres istnieje w naszej bazie, wyślemy na niego instrukcję resetu hasła w ciągu kilku chwil.",
    },
    200
  );
};
