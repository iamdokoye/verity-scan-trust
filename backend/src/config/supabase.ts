import { createClient, type SupabaseClientOptions } from '@supabase/supabase-js';
import WebSocket from 'ws';
import { env } from './env';

type RealtimeOptions = NonNullable<SupabaseClientOptions<'public'>['realtime']>;
const realtimeTransport = WebSocket as unknown as NonNullable<RealtimeOptions['transport']>;

// Service role client — used for storage operations and admin tasks.
// NEVER expose this key to the client.
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  realtime: {
    transport: realtimeTransport,
  },
});
