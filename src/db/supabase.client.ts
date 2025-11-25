import type { AstroCookies } from "astro";
import { createServerClient, type CookieOptionsWithName } from "@supabase/ssr";
import { createClient, type SupabaseClient as SupabaseClientBase } from "@supabase/supabase-js";

import type { Database } from "../db/database.types.ts";

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY;
const supabaseServiceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("SUPABASE_URL is required. Please add it to your .env file.");
}

if (!supabaseAnonKey) {
  throw new Error("SUPABASE_KEY is required. Please add it to your .env file.");
}

const isProduction = import.meta.env.MODE === "production";

export const cookieOptions: CookieOptionsWithName = {
  path: "/",
  secure: isProduction,
  httpOnly: true,
  sameSite: "lax",
};

function parseCookieHeader(cookieHeader: string) {
  if (!cookieHeader) {
    return [];
  }

  return cookieHeader.split(";").map((cookie) => {
    const [name, ...rest] = cookie.trim().split("=");
    return { name, value: rest.join("=") };
  });
}

export const createSupabaseServerInstance = (context: { headers: Headers; cookies: AstroCookies }) => {
  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookieOptions,
    cookies: {
      getAll() {
        return parseCookieHeader(context.headers.get("Cookie") ?? "");
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          context.cookies.set(name, value, { ...cookieOptions, ...options });
        });
      },
    },
  });
};

// Admin client for server-side operations (bypasses RLS)
// Only use this on the server-side, never expose to the client!
export const supabaseAdmin = supabaseServiceRoleKey
  ? createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

export type SupabaseClient = SupabaseClientBase<Database>;
