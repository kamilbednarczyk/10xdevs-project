import type { APIRoute } from "astro";

import { createSupabaseServerInstance } from "../../../db/supabase.client.ts";
import { FORCE_PASSWORD_UPDATE_COOKIE, FORCE_PASSWORD_UPDATE_MAX_AGE } from "@/lib/constants/auth";

const isProduction = import.meta.env?.MODE === "production";

export const prerender = false;

const isValidNextPath = (value: string | null): value is string => {
  if (!value) {
    return false;
  }

  return value.startsWith("/") && !value.startsWith("//");
};

export const GET: APIRoute = async ({ request, cookies, locals }) => {
  const currentUrl = new URL(request.url);
  const code = currentUrl.searchParams.get("code");
  const next = currentUrl.searchParams.get("next");

  if (!code) {
    return new Response(
      JSON.stringify({
        error: "MISSING_CODE",
        message: "Brak wymaganego parametru weryfikacyjnego.",
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const supabase =
    locals.supabase ??
    createSupabaseServerInstance({
      cookies,
      headers: request.headers,
      runtimeEnv: locals.runtime?.env,
    });

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return new Response(
      JSON.stringify({
        error: "AUTH_ERROR",
        message: "Nie udało się potwierdzić tokenu resetu. Spróbuj ponownie.",
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  cookies.set(FORCE_PASSWORD_UPDATE_COOKIE, "1", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    maxAge: FORCE_PASSWORD_UPDATE_MAX_AGE,
  });

  const target = isValidNextPath(next) ? next : "/auth/confirm";

  return new Response(null, {
    status: 303,
    headers: {
      Location: target,
    },
  });
};
