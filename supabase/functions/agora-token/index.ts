/**
 * Edge function pour générer des tokens Agora RTC
 * Retourne l'App ID pour l'authentification côté client
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { channelName, uid } = await req.json();
    const appId = Deno.env.get('AGORA_APP_ID');

    if (!appId) {
      throw new Error('AGORA_APP_ID not configured');
    }

    if (!channelName) {
      throw new Error('channelName is required');
    }

    console.log(`Agora auth for channel: ${channelName}, uid: ${uid || 0}`);

    return new Response(
      JSON.stringify({
        appId,
        channelName,
        uid: uid || 0,
        token: null,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});