import type { AstroCookies } from "astro";
import { createServerClient, type CookieOptionsWithName } from "@supabase/ssr";
import { createClient, type SupabaseClient as SupabaseClientBase } from "@supabase/supabase-js";

import type { Database } from "../db/database.types.ts";
import type { RuntimeEnvSource } from "@/lib/runtime-env";
import { requireEnvVar, resolveRuntimeEnv } from "@/lib/runtime-env";

const isProduction = import.meta.env?.MODE === "production";

export const cookieOptions: CookieOptionsWithName = {
  path: "/",
  secure: isProduction,
  httpOnly: true,
  sameSite: "lax",
};

interface SupabaseServerContext {
  headers: Headers;
  cookies: AstroCookies;
  runtimeEnv?: RuntimeEnvSource;
}

function parseCookieHeader(cookieHeader: string) {
  if (!cookieHeader) {
    return [];
  }

  return cookieHeader.split(";").map((cookie) => {
    const [name, ...rest] = cookie.trim().split("=");
    return { name, value: rest.join("=") };
  });
}

export const createSupabaseServerInstance = ({ headers, cookies, runtimeEnv }: SupabaseServerContext) => {
  const env = resolveRuntimeEnv(runtimeEnv);
  const supabaseUrl = requireEnvVar("SUPABASE_URL", env, "Supabase server client");
  const supabaseAnonKey = requireEnvVar("SUPABASE_KEY", env, "Supabase server client");

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookieOptions,
    cookies: {
      getAll() {
        return parseCookieHeader(headers.get("Cookie") ?? "");
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookies.set(name, value, { ...cookieOptions, ...options });
        });
      },
    },
  });
};

export const createSupabaseAdminClient = (runtimeEnv?: RuntimeEnvSource) => {
  const env = resolveRuntimeEnv(runtimeEnv);
  const supabaseUrl = requireEnvVar("SUPABASE_URL", env, "Supabase admin client");
  const supabaseServiceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseServiceRoleKey) {
    return null;
  }

  return createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

export type SupabaseClient = SupabaseClientBase<Database>;
