import { createClient } from "@supabase/supabase-js";
import { getSupabaseServerEnv } from "@/lib/config/env";

export function supabaseServer() {
  const env = getSupabaseServerEnv();
  return createClient(env.url, env.secretKey);
}
