/**
 * Edge function pour générer des tokens Agora RTC
 * Génération manuelle du token sans dépendance externe
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Simple Agora token generation using HMAC-SHA256
function packUint16(val: number): Uint8Array {
  const buf = new Uint8Array(2);
  buf[0] = val & 0xff;
  buf[1] = (val >> 8) & 0xff;
  return buf;
}

function packUint32(val: number): Uint8Array {
  const buf = new Uint8Array(4);
  buf[0] = val & 0xff;
  buf[1] = (val >> 8) & 0xff;
  buf[2] = (val >> 16) & 0xff;
  buf[3] = (val >> 24) & 0xff;
  return buf;
}

function packString(str: string): Uint8Array {
  const encoder = new TextEncoder();
  const strBytes = encoder.encode(str);
  const lenBytes = packUint16(strBytes.length);
  const result = new Uint8Array(lenBytes.length + strBytes.length);
  result.set(lenBytes);
  result.set(strBytes, lenBytes.length);
  return result;
}

function packMapUint32(map: Map<number, number>): Uint8Array {
  const parts: Uint8Array[] = [];
  parts.push(packUint16(map.size));
  for (const [key, value] of map) {
    parts.push(packUint16(key));
    parts.push(packUint32(value));
  }
  const totalLen = parts.reduce((acc, p) => acc + p.length, 0);
  const result = new Uint8Array(totalLen);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const totalLen = arrays.reduce((acc, a) => acc + a.length, 0);
  const result = new Uint8Array(totalLen);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

async function hmacSign(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, data);
  return new Uint8Array(sig);
}

// Privileges
const kJoinChannel = 1;
const kPublishAudioStream = 2;
const kPublishVideoStream = 3;
const kPublishDataStream = 4;

async function generateAccessToken(
  appId: string,
  appCertificate: string,
  channelName: string,
  uid: number,
  expireTimestamp: number
): Promise<string> {
  const encoder = new TextEncoder();
  
  const privileges = new Map<number, number>();
  privileges.set(kJoinChannel, expireTimestamp);
  privileges.set(kPublishAudioStream, expireTimestamp);
  privileges.set(kPublishVideoStream, expireTimestamp);
  privileges.set(kPublishDataStream, expireTimestamp);

  const uidStr = uid === 0 ? "" : String(uid);
  
  // Build message
  const message = concat(
    packUint32(0), // salt (random, using 0 for simplicity)
    packUint32(Math.floor(Date.now() / 1000)), // ts
    packMapUint32(privileges)
  );

  // Sign
  const toSign = concat(
    encoder.encode(appId),
    encoder.encode(channelName),
    encoder.encode(uidStr),
    message
  );

  const signature = await hmacSign(encoder.encode(appCertificate), toSign);

  // Pack content
  const content = concat(
    packString(new TextDecoder().decode(base64Encode(signature) as unknown as Uint8Array || encoder.encode(btoa(String.fromCharCode(...signature))))),
    packUint32(0), // crc_channel (simplified)
    packUint32(0), // crc_uid (simplified)
    packString(btoa(String.fromCharCode(...message)))
  );

  // Final token
  const version = "006";
  const contentB64 = btoa(String.fromCharCode(...content));
  
  return `${version}${appId}${contentB64}`;
}

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

    const { channelName, uid } = await req.json();

    if (!channelName) {
      return new Response(
        JSON.stringify({ error: 'channelName is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tokenUid = uid || 0;
    const expirationTimeInSeconds = 3600;
    const privilegeExpiredTs = Math.floor(Date.now() / 1000) + expirationTimeInSeconds;

    const token = await generateAccessToken(
      AGORA_APP_ID,
      AGORA_APP_CERTIFICATE,
      channelName,
      tokenUid,
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
