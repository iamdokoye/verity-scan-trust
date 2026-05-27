import { createClient } from "@supabase/supabase-js";

/**
 * Supabase browser client — used only for invite-acceptance / password-reset flows
 * that require direct Supabase auth calls (verifyOtp, updateUser).
 * All other auth goes through the Express backend.
 */
export const supabaseBrowser = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
