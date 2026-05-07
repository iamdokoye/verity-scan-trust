import { createClient } from '@supabase/supabase-js';
import { env } from './env';

// Service role client — used for storage operations and admin tasks.
// NEVER expose this key to the client.
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
