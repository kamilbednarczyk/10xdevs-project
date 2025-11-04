import { defineMiddleware } from "astro:middleware";

import { supabaseAdmin, supabaseClient } from "../db/supabase.client.ts";

export const onRequest = defineMiddleware((context, next) => {
  // Use admin client if available (for development without auth)
  // In production with auth enabled, this should use supabaseClient
  context.locals.supabase = supabaseAdmin || supabaseClient;
  return next();
});
