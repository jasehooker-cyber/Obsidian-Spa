import { createClient } from "@supabase/supabase-js";

const DEFAULT_STAFF_EMAILS = ["admin@obsidianspas.com"];

export class AuthError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

function getStaffAuthConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !anonKey) {
    throw new AuthError("Admin authentication is not configured", 503);
  }

  const configuredStaffEmails = (process.env.STAFF_ALLOWED_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  const staffAllowedEmails = Array.from(
    new Set([...DEFAULT_STAFF_EMAILS, ...configuredStaffEmails])
  );

  return { url, anonKey, staffAllowedEmails };
}

export async function assertStaffAuth(request: Request): Promise<string> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new AuthError("Missing authorization header", 401);
  }

  const token = authHeader.slice(7);
  const { url, anonKey, staffAllowedEmails } = getStaffAuthConfig();

  const supabase = createClient(url, anonKey);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user?.email) {
    throw new AuthError("Invalid or expired token", 401);
  }

  const email = user.email.toLowerCase();
  if (!staffAllowedEmails.includes(email)) {
    throw new AuthError("Not authorized as staff", 403);
  }

  return email;
}
