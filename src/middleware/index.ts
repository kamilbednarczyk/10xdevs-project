import { defineMiddleware } from "astro:middleware";

import { createSupabaseServerInstance } from "../db/supabase.client.ts";

const PUBLIC_PAGES = new Set(["/login", "/register", "/forgot-password", "/privacy", "/terms", "/auth/confirm"]);
const PROTECTED_PAGES = new Set(["/", "/flashcards", "/generate", "/study"]);
const ASSET_PREFIXES = ["/_astro", "/_image", "/favicon", "/robots", "/sitemap", "/public"];

const normalizePathname = (pathname: string) => {
  if (pathname === "/") {
    return pathname;
  }

  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
};

export const onRequest = defineMiddleware(async ({ locals, cookies, url, request, redirect }, next) => {
  const pathname = normalizePathname(url.pathname);

  const isAssetRequest = ASSET_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (isAssetRequest) {
    return next();
  }

  const supabase = createSupabaseServerInstance({
    cookies,
    headers: request.headers,
    runtimeEnv: locals.runtime?.env,
  });

  locals.supabase = supabase;

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  locals.user = !error && user ? { id: user.id, email: user.email } : undefined;

  const isAuthApi = pathname.startsWith("/api/auth");
  const isApiRoute = pathname.startsWith("/api/");
  const isPublicPage = PUBLIC_PAGES.has(pathname);
  const isProtectedPage = PROTECTED_PAGES.has(pathname);

  if (!locals.user) {
    if (isApiRoute && !isAuthApi) {
      return new Response(
        JSON.stringify({
          error: "UNAUTHORIZED",
          message: "Authentication required",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (isProtectedPage) {
      return redirect("/login");
    }
  }

  if (locals.user && isPublicPage) {
    return redirect("/");
  }

  return next();
});
