import { defineMiddleware } from "astro:middleware";

import { createSupabaseServerInstance } from "../db/supabase.client.ts";
import { FORCE_PASSWORD_UPDATE_COOKIE } from "@/lib/constants/auth";

const PUBLIC_PAGES = new Set(["/login", "/register", "/forgot-password", "/privacy", "/terms"]);
const PROTECTED_PAGES = new Set(["/", "/flashcards", "/generate", "/study", "/auth/confirm"]);
const FORCE_UPDATE_ALLOWED_PATHS = new Set(["/auth/confirm"]);
const FORCE_UPDATE_ALLOWED_API_PATHS = new Set(["/api/auth/update-password", "/api/auth/logout"]);
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

  locals.user = !error && user ? { id: user.id, email: user.email ?? null } : undefined;

  const isAuthApi = pathname.startsWith("/api/auth");
  const isApiRoute = pathname.startsWith("/api/");
  const isPublicPage = PUBLIC_PAGES.has(pathname);
  const isProtectedPage = PROTECTED_PAGES.has(pathname);
  const forcePasswordCookie = cookies.get(FORCE_PASSWORD_UPDATE_COOKIE);
  const mustUpdatePassword = Boolean(locals.user && forcePasswordCookie?.value);

  if (mustUpdatePassword) {
    const isAllowedForcePath = FORCE_UPDATE_ALLOWED_PATHS.has(pathname) || FORCE_UPDATE_ALLOWED_API_PATHS.has(pathname);

    if (!isAllowedForcePath) {
      return redirect("/auth/confirm");
    }
  }

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
