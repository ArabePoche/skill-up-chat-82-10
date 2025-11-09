import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
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

    console.log('📅 Sending daily reminders...');

    // Récupérer tous les tokens actifs avec préférence pour les rappels quotidiens
    const { data: tokens, error: tokensError } = await supabaseClient
      .from('push_tokens')
      .select('token, user_id, notification_preferences')
      .eq('is_active', true);

    if (tokensError) {
      console.error('Error fetching tokens:', tokensError);
      throw tokensError;
    }

    if (!tokens || tokens.length === 0) {
      console.log('⚠️ No active tokens found');
      return new Response(
        JSON.stringify({ success: true, message: 'No active tokens', sentCount: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filtrer uniquement ceux qui ont activé les rappels quotidiens
    const filteredTokens = tokens.filter(tokenData => {
      const prefs = tokenData.notification_preferences as any;
      return !prefs || prefs.daily_reminders !== false;
    });

    console.log(`📊 Sending to ${filteredTokens.length}/${tokens.length} users`);

    const serviceAccountKey = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_KEY');
    if (!serviceAccountKey) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY not configured');
    }

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
      
      // Extraire la clé privée du format PEM
      const pemKey = serviceAccount.private_key;
      const pemContents = pemKey
        .replace('-----BEGIN PRIVATE KEY-----', '')
        .replace('-----END PRIVATE KEY-----', '')
        .replace(/\n/g, '');
      
      const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
      
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

    // Messages variés pour les rappels
    const messages = [
      { title: '🎓 Continuez votre apprentissage !', body: 'Prenez quelques minutes pour réviser aujourd\'hui' },
      { title: '💪 Restez motivé !', body: 'Votre prochaine leçon vous attend' },
      { title: '🌟 Progressez chaque jour', body: 'Même 10 minutes peuvent faire la différence' },
      { title: '📚 Moment d\'apprendre !', body: 'Découvrez quelque chose de nouveau aujourd\'hui' },
    ];

    const randomMessage = messages[Math.floor(Math.random() * messages.length)];

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
                  title: randomMessage.title,
                  body: randomMessage.body,
                },
                webpush: {
                  notification: {
                    icon: '/icon-192.png',
                    badge: '/badge-72.png',
                    tag: 'eductok-daily-reminder'
                  },
                  fcm_options: {
                    link: '/cours'
                  }
                },
                data: {
                  type: 'daily_reminder',
                  click_action: '/cours'
                }
              }
            })
          }
        );

        const result = await response.json();

        // Créer une notification en base de données
        await supabaseClient
          .from('notifications')
          .insert({
            user_id: tokenData.user_id,
            type: 'daily_reminder',
            title: randomMessage.title,
            message: randomMessage.body,
            data: { click_action: '/cours' },
            is_read: false
          });

        return { success: response.ok, userId: tokenData.user_id };
      } catch (error) {
        console.error('Error sending reminder:', error);
        return { success: false, userId: tokenData.user_id };
      }
    });

    const results = await Promise.all(notificationPromises);
    const successCount = results.filter(r => r.success).length;

    console.log(`✅ Sent ${successCount}/${results.length} daily reminders`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sentCount: successCount,
        totalCount: results.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in send-daily-reminders:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
