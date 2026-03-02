/**
 * Edge function pour générer des tokens Agora RTC
 * Utilise le package npm agora-access-token
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { RtcTokenBuilder, RtcRole } from "npm:agora-access-token@2.0.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const AGORA_APP_ID = Deno.env.get('AGORA_APP_ID');
    const AGORA_APP_CERTIFICATE = Deno.env.get('AGORA_APP_CERTIFICATE');

    if (!AGORA_APP_ID || !AGORA_APP_CERTIFICATE) {
      console.error('Missing Agora credentials');
      return new Response(
        JSON.stringify({ error: 'Agora credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { channelName, uid, role: roleStr } = await req.json();

    if (!channelName) {
      return new Response(
        JSON.stringify({ error: 'channelName is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Role: publisher (can send media) or subscriber (can only receive)
    const role = roleStr === 'subscriber' ? RtcRole.SUBSCRIBER : RtcRole.PUBLISHER;

    // Token expires in 1 hour
    const expirationTimeInSeconds = 3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    // Use uid 0 if not provided (allows any user to use the token)
    const tokenUid = uid || 0;

    const token = RtcTokenBuilder.buildTokenWithUid(
      AGORA_APP_ID,
      AGORA_APP_CERTIFICATE,
      channelName,
      tokenUid,
      role,
      privilegeExpiredTs
    );

    console.log(`Token generated for channel: ${channelName}, uid: ${tokenUid}`);

    return new Response(
      JSON.stringify({ token, appId: AGORA_APP_ID, uid: tokenUid, channelName }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating Agora token:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
