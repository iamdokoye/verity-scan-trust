import { createClient } from "@supabase/supabase-js";

/**
 * Supabase browser client — used only for invite-acceptance / password-reset flows
 * that require direct Supabase auth calls (verifyOtp, updateUser).
 * All other auth goes through the Express backend.
 */
export function getSupabaseBrowser() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Supabase invite flow is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}
