import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationPayload {
  userIds?: string[];
  title: string;
  message?: string;
  type: 'daily_reminder' | 'teacher_response' | 'exercise_validation' | 'new_lesson' | 'test';
  clickAction?: string;
  data?: Record<string, any>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const payload: NotificationPayload = await req.json();
    console.log('📨 Notification request:', payload);

    const { userIds, title, message, type, clickAction, data } = payload;

    if (!userIds || userIds.length === 0) {
      throw new Error('userIds is required');
    }

    // Récupérer les tokens FCM actifs pour ces utilisateurs
    const { data: tokens, error: tokensError } = await supabaseClient
      .from('push_tokens')
      .select('token, user_id, notification_preferences')
      .in('user_id', userIds)
      .eq('is_active', true);

    if (tokensError) {
      console.error('Error fetching tokens:', tokensError);
      throw tokensError;
    }

    if (!tokens || tokens.length === 0) {
      console.log('⚠️ No active tokens found for users:', userIds);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No active tokens found',
          sentCount: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filtrer les tokens selon les préférences de notification
    const filteredTokens = tokens.filter(tokenData => {
      const prefs = tokenData.notification_preferences as any;
      if (!prefs) return true;

      switch (type) {
        case 'daily_reminder':
          return prefs.daily_reminders !== false;
        case 'teacher_response':
          return prefs.teacher_responses !== false;
        case 'exercise_validation':
          return prefs.exercise_validation !== false;
        case 'new_lesson':
          return prefs.new_lessons !== false;
        default:
          return true;
      }
    });

    console.log(`📊 Sending to ${filteredTokens.length}/${tokens.length} tokens`);

    // Envoyer via Firebase Cloud Messaging v1 API (moderne)
    const serviceAccountKey = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_KEY');
    if (!serviceAccountKey) {
      console.error('❌ FIREBASE_SERVICE_ACCOUNT_KEY not configured');
      throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY not configured');
    }

    // Parser le service account
    const serviceAccount = JSON.parse(serviceAccountKey);
    
    // Fonction helper pour encoder en base64url
    const base64url = (str: string) => {
      return btoa(str)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
    };
    
    // Obtenir le token d'accès OAuth2
    const getAccessToken = async () => {
      const jwtHeader = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
      const now = Math.floor(Date.now() / 1000);
      const jwtClaimSet = {
        iss: serviceAccount.client_email,
        scope: 'https://www.googleapis.com/auth/firebase.messaging',
        aud: 'https://oauth2.googleapis.com/token',
        exp: now + 3600,
        iat: now
      };
      
      const jwtClaimSetEncoded = base64url(JSON.stringify(jwtClaimSet));
      const signatureInput = `${jwtHeader}.${jwtClaimSetEncoded}`;
      
      // Extraire la clé privée - gérer les \n littéraux dans le JSON
      let pemKey = serviceAccount.private_key as string;
      if (!pemKey || typeof pemKey !== 'string') {
        throw new Error('Service account private_key is missing or invalid');
      }
      
      // Remplacer les \n littéraux par de vraies nouvelles lignes si nécessaire
      if (pemKey.includes('\\n')) {
        pemKey = pemKey.replace(/\\n/g, '\n');
      }
      
      // Extraire le contenu base64 de la clé PEM (gérer aussi RSA PRIVATE KEY)
      let pemContents = pemKey
        .replace(/-----BEGIN PRIVATE KEY-----/g, '')
        .replace(/-----END PRIVATE KEY-----/g, '')
        .replace(/-----BEGIN RSA PRIVATE KEY-----/g, '')
        .replace(/-----END RSA PRIVATE KEY-----/g, '')
        .replace(/[\r\n\s]/g, '');

      // Corriger le padding base64 si nécessaire
      const remainder = pemContents.length % 4;
      if (remainder === 2) pemContents += '==';
      else if (remainder === 3) pemContents += '=';
      else if (remainder === 1) {
        console.error('❌ Invalid base64 length for private key');
        throw new Error('Failed to decode base64');
      }

      // Décoder la clé base64 avec gestion d'erreur explicite
      let binaryString: string;
      try {
        binaryString = atob(pemContents);
      } catch (e) {
        console.error('❌ Base64 decode failed for private key');
        throw e;
      }
      const binaryKey = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        binaryKey[i] = binaryString.charCodeAt(i);
      }
      
      // Importer la clé privée
      const privateKey = await crypto.subtle.importKey(
        'pkcs8',
        binaryKey,
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['sign']
      );
      
      const signature = await crypto.subtle.sign(
        'RSASSA-PKCS1-v1_5',
        privateKey,
        new TextEncoder().encode(signatureInput)
      );
      
      const signatureArray = new Uint8Array(signature);
      const signatureBase64 = base64url(String.fromCharCode(...signatureArray));
      const jwt = `${signatureInput}.${signatureBase64}`;
      
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
      });
      
      const tokenData = await tokenResponse.json();
      if (!tokenData.access_token) {
        console.error('❌ Token error:', tokenData);
        throw new Error(`Failed to get access token: ${JSON.stringify(tokenData)}`);
      }
      return tokenData.access_token;
    };

    const accessToken = await getAccessToken();

    const notificationPromises = filteredTokens.map(async (tokenData) => {
      try {
        const response = await fetch(
          `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: {
                token: tokenData.token,
                notification: {
                  title,
                  body: message || '',
                },
                webpush: {
                  notification: {
                    icon: '/icon-192.png',
                    badge: '/badge-72.png',
                    tag: 'eductok-notification'
                  },
                  fcm_options: {
                    link: clickAction || '/'
                  }
                },
                data: {
                  type,
                  click_action: clickAction || '/',
                  ...data
                }
              }
            })
          }
        );

        const result = await response.json();
        console.log('FCM Response:', result);

        // Créer une notification dans la base de données
        await supabaseClient
          .from('notifications')
          .insert({
            user_id: tokenData.user_id,
            type,
            title,
            message: message || '',
            data: { ...data, clickAction },
            is_read: false
          });

        return { success: response.ok, userId: tokenData.user_id, result };
      } catch (error) {
        console.error('Error sending to token:', tokenData.token, error);
        return { success: false, userId: tokenData.user_id, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    const results = await Promise.all(notificationPromises);
    const successCount = results.filter(r => r.success).length;

    console.log(`✅ Sent ${successCount}/${results.length} notifications`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sentCount: successCount,
        totalCount: results.length,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in send-push-notification:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
