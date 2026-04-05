/**
 * Edge function pour générer des tokens Agora RTC
 * Retourne un vrai token RTC quand AGORA_APP_CERTIFICATE est configuré.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import * as AgoraAccessToken from "npm:agora-access-token@2.0.4";

const { RtcRole, RtcTokenBuilder } = AgoraAccessToken as {
  RtcRole: { PUBLISHER: number; SUBSCRIBER: number };
  RtcTokenBuilder: {
    buildTokenWithUid: (
      appId: string,
      appCertificate: string,
      channelName: string,
      uid: number,
      role: number,
      privilegeExpiredTs: number
    ) => string;
  };
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { channelName, uid, role } = await req.json();
    const appId = Deno.env.get('AGORA_APP_ID');
    const appCertificate = Deno.env.get('AGORA_APP_CERTIFICATE');

    if (!appId) {
      throw new Error('AGORA_APP_ID not configured');
    }

    if (!appCertificate) {
      throw new Error('AGORA_APP_CERTIFICATE not configured');
    }

    if (!channelName) {
      throw new Error('channelName is required');
    }

    const agoraUid = Number.isFinite(uid) ? Number(uid) : 0;
    const normalizedRole = role === 'subscriber' ? RtcRole.SUBSCRIBER : RtcRole.PUBLISHER;
    const privilegeExpiredTs = Math.floor(Date.now() / 1000) + 60 * 60;
    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      agoraUid,
      normalizedRole,
      privilegeExpiredTs,
    );

    console.log(`Agora auth for channel: ${channelName}, uid: ${agoraUid}, role: ${role || 'publisher'}`);

    return new Response(
      JSON.stringify({
        appId,
        channelName,
        uid: agoraUid,
        token,
        expiresAt: privilegeExpiredTs,
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