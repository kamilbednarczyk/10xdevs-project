/// <reference types="astro/client" />

import type { Runtime } from "@astrojs/cloudflare";

import type { SupabaseClient } from "./db/supabase.client.ts";
import type { RuntimeEnvBindings } from "@/lib/runtime-env";

declare global {
  namespace App {
    interface Locals extends Runtime<RuntimeEnvBindings> {
      supabase: SupabaseClient;
      user?: {
        id: string;
        email: string | null;
      };
    }
  }
}

interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_KEY: string;
  readonly SUPABASE_SERVICE_ROLE_KEY?: string;
  readonly OPENROUTER_API_KEY: string;
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
