import { createClient } from "@supabase/supabase-js";
import { getEnv } from "@/lib/config/env";

export function supabaseServer() {
  const env = getEnv();
  return createClient(env.supabase.url, env.supabase.secretKey);
}
