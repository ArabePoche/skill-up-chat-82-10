import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationPayload {
  userIds?: string[];
  title: string;
  message?: string;
  type: string;
  clickAction?: string;
  data?: Record<string, any>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Parse request body
    const payload: NotificationPayload = await req.json();
    const { userIds, title, message, type, clickAction, data } = payload;

    console.log('📨 Sending push notification:', { userIds, title, type });

    // Get Firebase service account credentials
    const firebaseServiceAccount = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
    if (!firebaseServiceAccount) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT not configured');
    }

    const serviceAccount = JSON.parse(firebaseServiceAccount);

    // Get FCM tokens for users
    let tokensQuery = supabaseClient
      .from('push_tokens')
      .select('token, user_id, notification_preferences')
      .eq('is_active', true);

    if (userIds && userIds.length > 0) {
      tokensQuery = tokensQuery.in('user_id', userIds);
    }

    const { data: pushTokens, error: tokensError } = await tokensQuery;

    if (tokensError) {
      console.error('Error fetching tokens:', tokensError);
      throw tokensError;
    }

    if (!pushTokens || pushTokens.length === 0) {
      console.log('⚠️ No active push tokens found for users');
      return new Response(
        JSON.stringify({ success: true, message: 'No active tokens found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Filter tokens based on user preferences
    const filteredTokens = pushTokens.filter(token => {
      const prefs = token.notification_preferences as any;
      if (!prefs) return true; // Send if no preferences set

      // Check preference based on notification type
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

    if (filteredTokens.length === 0) {
      console.log('⚠️ All users have disabled this notification type');
      return new Response(
        JSON.stringify({ success: true, message: 'Users have disabled this notification type' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Get OAuth2 access token for Firebase
    const accessToken = await getFirebaseAccessToken(serviceAccount);

    // Send notifications via Firebase Cloud Messaging
    const results = await Promise.allSettled(
      filteredTokens.map(async (tokenData) => {
        const fcmMessage = {
          message: {
            token: tokenData.token,
            notification: {
              title: title,
              body: message || '',
            },
            data: {
              click_action: clickAction || '/',
              type: type,
              ...(data || {}),
            },
            webpush: {
              fcm_options: {
                link: clickAction || '/',
              },
            },
          },
        };

        const response = await fetch(
          `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify(fcmMessage),
          }
        );

        if (!response.ok) {
          const errorData = await response.text();
          console.error(`Failed to send to token ${tokenData.token.substring(0, 20)}...`, errorData);
          
          // If token is invalid, mark it as inactive
          if (response.status === 404 || errorData.includes('NOT_FOUND') || errorData.includes('INVALID_ARGUMENT')) {
            await supabaseClient
              .from('push_tokens')
              .update({ is_active: false })
              .eq('token', tokenData.token);
            console.log(`❌ Marked token as inactive: ${tokenData.token.substring(0, 20)}...`);
          }
          
          throw new Error(`FCM Error: ${errorData}`);
        }

        const result = await response.json();
        console.log(`✅ Sent notification to user ${tokenData.user_id}`);
        return result;
      })
    );

    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failCount = results.filter(r => r.status === 'rejected').length;

    console.log(`📊 Results: ${successCount} sent, ${failCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        failed: failCount,
        total: results.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('❌ Error sending push notification:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

// Helper function to get Firebase OAuth2 access token
async function getFirebaseAccessToken(serviceAccount: any): Promise<string> {
  const jwtHeader = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const jwtClaimSet = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  // Import crypto for signing
  const encoder = new TextEncoder();
  const privateKey = serviceAccount.private_key;

  // Create JWT
  const headerBase64 = btoa(JSON.stringify(jwtHeader)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const claimSetBase64 = btoa(JSON.stringify(jwtClaimSet)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const unsignedToken = `${headerBase64}.${claimSetBase64}`;

  // Import the private key
  const pemHeader = '-----BEGIN PRIVATE KEY-----';
  const pemFooter = '-----END PRIVATE KEY-----';
  const pemContents = privateKey.substring(
    pemHeader.length,
    privateKey.length - pemFooter.length - 1
  ).replace(/\s/g, '');
  
  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );

  // Sign the token
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    encoder.encode(unsignedToken)
  );

  const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const jwt = `${unsignedToken}.${signatureBase64}`;

  // Exchange JWT for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new Error(`Failed to get access token: ${errorText}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}
