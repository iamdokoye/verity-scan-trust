import { createClient, type SupabaseClientOptions } from '@supabase/supabase-js';
import WebSocket from 'ws';
import { env } from './env';

type RealtimeOptions = NonNullable<SupabaseClientOptions<'public'>['realtime']>;
const realtimeTransport = WebSocket as unknown as NonNullable<RealtimeOptions['transport']>;

// Service role client — used for storage operations and admin (auth.admin.*)
// tasks. Those admin calls are stateless REST calls, so sharing this one
// instance across requests is safe. NEVER expose this key to the client.
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  realtime: {
    transport: realtimeTransport,
  },
});

// signInWithPassword / refreshSession / signUp mutate the calling client's
// own internal session state — a single shared GoTrueClient is built to
// represent one end user, not a multi-tenant server. Reusing `supabase`
// (above) for those calls lets concurrent logins from different users race
// and hand back (or later serve, via the client's internal session) the
// wrong user's tokens. Give every such call its own short-lived client.
export function createUserAuthClient() {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    // Node < 22 has no native WebSocket, and supabase-js throws when building
    // the client without a transport — even though this client never opens a
    // realtime connection.
    realtime: {
      transport: realtimeTransport,
    },
  });
}
