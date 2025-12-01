import type { APIRoute } from "astro";

import { createSupabaseServerInstance } from "../../../db/supabase.client.ts";

export const prerender = false;

export const POST: APIRoute = async ({ cookies, request, redirect, locals }) => {
  const supabase = createSupabaseServerInstance({
    cookies,
    headers: request.headers,
    runtimeEnv: locals.runtime?.env,
  });
  const { error } = await supabase.auth.signOut();

  if (error) {
    return new Response(
      JSON.stringify({
        error: "AUTH_ERROR",
        message: error.message,
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  return redirect("/login");
};
