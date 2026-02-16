import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface NotificationPayload {
  userIds: string[];
  title: string;
  message: string;
  type?: string;
  data?: Record<string, string>;
}

// Fonction pour créer un JWT pour l'authentification Google OAuth2
async function createJWT(clientEmail: string, privateKey: string): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Importer la clé privée
  const pemContents = privateKey.replace(/\\n/g, '\n').replace(/-----BEGIN PRIVATE KEY-----/, '').replace(/-----END PRIVATE KEY-----/, '').replace(/\s/g, '');
  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    encoder.encode(unsignedToken)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  return `${unsignedToken}.${signatureB64}`;
}

// Fonction pour obtenir un access token OAuth2
async function getAccessToken(clientEmail: string, privateKey: string): Promise<string> {
  const jwt = await createJWT(clientEmail, privateKey);
  
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erreur OAuth2: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Lire le JSON du compte de service Firebase
    const serviceAccountJson = Deno.env.get('firebase_service_account');
    
    if (!serviceAccountJson) {
      throw new Error('Secret firebase_service_account non configuré');
    }

    let serviceAccount;
    try {
      serviceAccount = JSON.parse(serviceAccountJson);
    } catch (parseError) {
      throw new Error('Le secret firebase_service_account n\'est pas un JSON valide');
    }

    const gcpProjectId = serviceAccount.project_id;
    const gcpClientEmail = serviceAccount.client_email;
    const gcpPrivateKey = serviceAccount.private_key;

    if (!gcpProjectId || !gcpClientEmail || !gcpPrivateKey) {
      throw new Error('Le JSON du compte de service est incomplet (project_id, client_email ou private_key manquant)');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const payload: NotificationPayload = await req.json();

    console.log('📨 Envoi de notification push via FCM v1:', {
      userIds: payload.userIds,
      title: payload.title,
    });

    // Récupérer les tokens actifs pour les utilisateurs ciblés
    const { data: tokens, error: tokensError } = await supabase
      .from('push_tokens')
      .select('token, user_id')
      .in('user_id', payload.userIds)
      .eq('is_active', true);

    if (tokensError) {
      throw tokensError;
    }

    if (!tokens || tokens.length === 0) {
      console.log('ℹ️ Aucun token actif trouvé pour ces utilisateurs');
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'Aucun token actif' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Obtenir un access token OAuth2
    console.log('🔑 Obtention du token OAuth2...');
    const accessToken = await getAccessToken(gcpClientEmail, gcpPrivateKey);
    console.log('✅ Token OAuth2 obtenu');

    let sent = 0;
    let failed = 0;

    // Envoyer via FCM v1 pour chaque token
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${gcpProjectId}/messages:send`;
    
    for (const tokenData of tokens) {
      try {
        const fcmResponse = await fetch(fcmUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            message: {
              token: tokenData.token,
              notification: {
                title: payload.title,
                body: payload.message,
                ...(payload.data?.imageUrl ? { image: payload.data.imageUrl } : {}),
              },
              webpush: {
                notification: {
                  icon: '/icon-192.png',
                  badge: '/badge-72.png',
                  ...(payload.data?.imageUrl ? { image: payload.data.imageUrl } : {}),
                },
              },
              data: {
                ...(payload.data || {}),
                click_action: payload.data?.clickAction || '/',
              },
            },
          }),
        });

        const fcmResult = await fcmResponse.json();

        if (fcmResponse.ok) {
          sent++;
          console.log(`✅ Notification envoyée à user ${tokenData.user_id}`);
        } else {
          failed++;
          console.error(`❌ Erreur FCM pour user ${tokenData.user_id}:`, fcmResult);
          
          // Si le token est invalide, désactiver dans la base
          if (fcmResult.error?.code === 404 || 
              fcmResult.error?.details?.[0]?.errorCode === 'UNREGISTERED') {
            await supabase
              .from('push_tokens')
              .update({ is_active: false })
              .eq('token', tokenData.token);
            console.log(`🗑️ Token désactivé pour user ${tokenData.user_id}`);
          }
        }
      } catch (err) {
        failed++;
        console.error(`❌ Erreur pour user ${tokenData.user_id}:`, err);
      }
    }

    console.log(`✅ Notifications envoyées: ${sent}, Échecs: ${failed}`);

    return new Response(
      JSON.stringify({ success: true, sent, failed, total: tokens.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de la notification:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur inconnue' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
