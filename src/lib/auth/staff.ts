import { createClient } from "@supabase/supabase-js";
import { getEnv } from "@/lib/config/env";

export class AuthError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

export async function assertStaffAuth(request: Request): Promise<string> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new AuthError("Missing authorization header", 401);
  }

  const token = authHeader.slice(7);
  const env = getEnv();

  const supabase = createClient(env.supabase.url, env.supabase.anonKey);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user?.email) {
    throw new AuthError("Invalid or expired token", 401);
  }

  const email = user.email.toLowerCase();
  if (!env.auth.staffAllowedEmails.includes(email)) {
    throw new AuthError("Not authorized as staff", 403);
  }

  return email;
}
