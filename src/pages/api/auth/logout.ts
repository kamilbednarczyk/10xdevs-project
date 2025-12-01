import type { APIRoute } from "astro";

export const prerender = false;

export const POST: APIRoute = async ({ locals, redirect }) => {
  const supabase = locals.supabase;
  if (!supabase) {
    return new Response(
      JSON.stringify({
        error: "SERVER_ERROR",
        message: "Brak połączenia z serwerem uwierzytelniania. Spróbuj ponownie.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
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
