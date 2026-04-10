import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

export const predictionCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-idempotency-key, x-admin-key",
};

export type AuthenticatedUser = {
  id: string;
};

export function jsonResponse(body: unknown, status: number = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...predictionCorsHeaders, "Content-Type": "application/json" },
  });
}

export function createSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );
}

export function createSupabaseUserClient(authHeader: string) {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    {
      auth: { persistSession: false },
      global: {
        headers: { Authorization: authHeader },
      },
    },
  );
}

export async function requireAuthenticatedUser(req: Request): Promise<
  { user: AuthenticatedUser; supabaseAdmin: ReturnType<typeof createSupabaseAdmin> } | Response
> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ error: "No authorization header" }, 401);
  }

  const token = authHeader.replace("Bearer ", "");
  const supabaseAdmin = createSupabaseAdmin();
  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return jsonResponse({ error: "Authentication failed" }, 401);
  }

  return {
    user: { id: user.id },
    supabaseAdmin,
  };
}

export function requireAdminKey(req: Request): true | Response {
  const expected = Deno.env.get("PREDICTIONS_ADMIN_KEY");
  if (!expected) {
    return jsonResponse({ error: "Missing PREDICTIONS_ADMIN_KEY in function env" }, 500);
  }

  const actual = req.headers.get("x-admin-key") ?? "";
  if (!actual || actual !== expected) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  return true;
}

export function getIdempotencyKey(req: Request): string | null {
  return req.headers.get("x-idempotency-key");
}
