import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

/**
 * Browser-side Supabase client, created on first use.
 *
 * Must only be called from an effect or an event handler. Calling it during
 * render would run on the server too, where the public env vars may not be
 * present — which fails the build rather than the request.
 */
export function supabaseBrowser(): SupabaseClient {
  if (!cached) {
    cached = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );
  }
  return cached;
}
