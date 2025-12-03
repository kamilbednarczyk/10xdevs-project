import type { APIRoute } from "astro";

import { UpdatePasswordServerSchema } from "@/lib/schemas/auth.schema";
import { FORCE_PASSWORD_UPDATE_COOKIE } from "@/lib/constants/auth";
import { createSupabaseServerInstance } from "../../../db/supabase.client.ts";

export const prerender = false;

const jsonResponse = (body: Record<string, unknown>, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  const supabase =
    locals.supabase ??
    createSupabaseServerInstance({
      cookies,
      headers: request.headers,
      runtimeEnv: locals.runtime?.env,
    });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonResponse(
      {
        error: "UNAUTHORIZED",
        message: "Nie masz uprawnień do wykonania tej operacji.",
      },
      401
    );
  }

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

  const parsed = UpdatePasswordServerSchema.safeParse(payload);

  if (!parsed.success) {
    return jsonResponse(
      {
        error: "VALIDATION_ERROR",
        message: parsed.error.errors[0]?.message ?? "Podaj poprawne hasło.",
      },
      400
    );
  }

  const { password } = parsed.data;
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return jsonResponse(
      {
        error: "AUTH_ERROR",
        message: error.message ?? "Nie udało się zaktualizować hasła.",
      },
      400
    );
  }

  cookies.delete(FORCE_PASSWORD_UPDATE_COOKIE, { path: "/" });

  const { error: signOutError } = await supabase.auth.signOut();

  if (signOutError) {
    return jsonResponse(
      {
        error: "LOGOUT_ERROR",
        message: "Hasło zmienione, ale nie udało się zakończyć sesji. Spróbuj ponownie.",
      },
      500
    );
  }

  return jsonResponse({ message: "Hasło zmienione pomyślnie." }, 200);
};
