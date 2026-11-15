import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
export const supabaseUrl = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
export const supabaseKey = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string | undefined;
let client: ReturnType<typeof createClient<Database>> | undefined;
export function browserDb() {
  if (!supabaseUrl || !supabaseKey)
    throw new Error(
      "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.",
    );
  return (client ??= createClient<Database>(supabaseUrl, supabaseKey));
}
export function requestDb(token: string) {
  if (!supabaseUrl || !supabaseKey) throw new Error("Supabase configuration unavailable");
  return createClient<Database>(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
