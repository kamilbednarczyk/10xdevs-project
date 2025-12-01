import type { APIRoute } from "astro";

import { RegisterSchema } from "@/lib/schemas/auth.schema";

export const prerender = false;

const jsonResponse = (body: Record<string, unknown>, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export const POST: APIRoute = async ({ request, locals }) => {
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

  const parsed = RegisterSchema.safeParse(payload);

  if (!parsed.success) {
    return jsonResponse(
      {
        error: "VALIDATION_ERROR",
        message: parsed.error.errors[0]?.message ?? "Podaj poprawne dane rejestracyjne.",
      },
      400
    );
  }

  const { email, password } = parsed.data;
  const supabase = locals.supabase;
  if (!supabase) {
    return jsonResponse(
      {
        error: "SERVER_ERROR",
        message: "Brak połączenia z serwerem uwierzytelniania. Spróbuj ponownie.",
      },
      500
    );
  }
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: new URL("/login", request.url).toString(),
    },
  });

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
