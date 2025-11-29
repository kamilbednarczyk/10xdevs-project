import type { FullConfig } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

import type { Database } from "../../src/db/database.types.ts";

dotenv.config({ path: path.resolve(process.cwd(), ".env.test") });

const REQUIRED_ENV_VARS = ["SUPABASE_URL", "SUPABASE_KEY", "E2E_USERNAME_ID"] as const;
type RequiredEnvVar = (typeof REQUIRED_ENV_VARS)[number];

function assertEnvVar(name: RequiredEnvVar) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`[playwright:teardown] Missing required env variable: ${name}`);
  }

  return value;
}

export default async function globalTeardown(_: FullConfig) {
  const missing = REQUIRED_ENV_VARS.filter((name) => !process.env[name]);

  if (missing.length > 0) {
    console.warn(
      `[playwright:teardown] Skipping Supabase cleanup because env variables are missing: ${missing.join(", ")}`
    );
    return;
  }

  const supabaseUrl = assertEnvVar("SUPABASE_URL");
  const supabaseServiceRoleKey = assertEnvVar("SUPABASE_KEY");
  const userId = assertEnvVar("E2E_USERNAME_ID");

  const supabase = createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    const deleteForUser = async (table: "flashcards" | "generations") => {
      const { error, count } = await supabase.from(table).delete({ count: "exact" }).eq("user_id", userId);

      if (error) {
        throw new Error(`[playwright:teardown] Failed to delete ${table} for user ${userId}: ${error.message}`);
      }

      return count ?? 0;
    };

    const flashcardsRemoved = await deleteForUser("flashcards");
    const generationsRemoved = await deleteForUser("generations");

    console.info(
      `[playwright:teardown] Cleaned up Supabase data for user ${userId} (flashcards: ${flashcardsRemoved}, generations: ${generationsRemoved})`
    );
  } catch (error) {
    console.error(error);
    throw error;
  }
}
