import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Lightweight Supabase Edge Function — returns status of the Supabase project.
// Called by monitoring/uptime checks that want to verify Supabase (not Express) is up.
// The Express backend has its own GET /health endpoint.
serve((_req) => {
  return new Response(
    JSON.stringify({ status: "ok", service: "votta-supabase", timestamp: new Date().toISOString() }),
    { headers: { "Content-Type": "application/json" } }
  );
});
