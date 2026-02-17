/**
 * send-formation-promo
 * 
 * Envoie des notifications push publicitaires pour les formations actives.
 * IMPORTANT: N'envoie JAMAIS une notification pour une formation
 * à un utilisateur déjà inscrit (enrollment_requests approved).
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Réutilise la logique JWT du send-push-notification
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

  const pemContents = privateKey.replace(/\\n/g, '\n').replace(/-----BEGIN PRIVATE KEY-----/, '').replace(/-----END PRIVATE KEY-----/, '').replace(/\s/g, '');
  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  );

  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, encoder.encode(unsignedToken));
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  return `${unsignedToken}.${signatureB64}`;
}

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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const serviceAccountJson = Deno.env.get('firebase_service_account');

    if (!serviceAccountJson) {
      throw new Error('Secret firebase_service_account non configuré');
    }

    const serviceAccount = JSON.parse(serviceAccountJson);
    const { project_id: gcpProjectId, client_email: gcpClientEmail, private_key: gcpPrivateKey } = serviceAccount;

    if (!gcpProjectId || !gcpClientEmail || !gcpPrivateKey) {
      throw new Error('JSON du compte de service incomplet');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Récupérer les formations actives avec image et prix
    const { data: formations, error: formError } = await supabase
      .from('formations')
      .select('id, title, description, price, original_price, discount_percentage, image_url, thumbnail_url, badge')
      .eq('is_active', true);

    if (formError) throw formError;
    if (!formations || formations.length === 0) {
      console.log('ℹ️ Aucune formation active');
      return new Response(
        JSON.stringify({ success: true, message: 'Aucune formation active' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Choisir une formation aléatoire pour la promo
    const formation = formations[Math.floor(Math.random() * formations.length)];
    console.log(`📢 Formation choisie pour la promo: "${formation.title}" (${formation.id})`);

    // 2. Récupérer les user_ids déjà inscrits à CETTE formation (approved)
    const { data: enrolledUsers, error: enrollError } = await supabase
      .from('enrollment_requests')
      .select('user_id')
      .eq('formation_id', formation.id)
      .eq('status', 'approved');

    if (enrollError) throw enrollError;

    const enrolledUserIds = new Set((enrolledUsers || []).map(e => e.user_id));
    console.log(`🚫 ${enrolledUserIds.size} utilisateurs déjà inscrits (exclus)`);

    // 3. Récupérer TOUS les tokens push actifs
    const { data: allTokens, error: tokensError } = await supabase
      .from('push_tokens')
      .select('token, user_id')
      .eq('is_active', true);

    if (tokensError) throw tokensError;
    if (!allTokens || allTokens.length === 0) {
      console.log('ℹ️ Aucun token push actif');
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'Aucun token actif' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Filtrer: exclure les utilisateurs déjà inscrits
    const eligibleTokens = allTokens.filter(t => !enrolledUserIds.has(t.user_id));
    console.log(`📬 ${eligibleTokens.length} utilisateurs éligibles (sur ${allTokens.length} tokens actifs)`);

    if (eligibleTokens.length === 0) {
      console.log('ℹ️ Tous les utilisateurs avec tokens sont déjà inscrits');
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'Tous inscrits' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Construire le message promo
    const priceText = formation.price
      ? (formation.discount_percentage
        ? `🔥 -${formation.discount_percentage}% → ${formation.price}€`
        : `💰 ${formation.price}€`)
      : '🆓 Gratuit';

    const title = `📚 Découvrez: ${formation.title || 'Nouvelle formation'}`;
    const body = formation.description
      ? `${formation.description.substring(0, 80)}... ${priceText}`
      : `${priceText} — Inscrivez-vous maintenant !`;

    const imageUrl = formation.image_url || formation.thumbnail_url || '';

    // 6. Envoyer via FCM v1
    const accessToken = await getAccessToken(gcpClientEmail, gcpPrivateKey);
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${gcpProjectId}/messages:send`;

    let sent = 0;
    let failed = 0;

    for (const tokenData of eligibleTokens) {
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
                title,
                body,
                ...(imageUrl ? { image: imageUrl } : {}),
              },
              android: {
                notification: {
                  icon: 'ic_notification',
                  ...(imageUrl ? { image: imageUrl } : {}),
                },
              },
              webpush: {
                notification: {
                  icon: '/icon-192.png',
                  badge: '/badge-72.png',
                  ...(imageUrl ? { image: imageUrl } : {}),
                },
              },
              data: {
                click_action: `/formations/${formation.id}`,
                formation_id: formation.id,
                type: 'formation_promo',
              },
            },
          }),
        });

        const fcmResult = await fcmResponse.json();

        if (fcmResponse.ok) {
          sent++;
        } else {
          failed++;
          console.error(`❌ FCM error user ${tokenData.user_id}:`, fcmResult);
          if (fcmResult.error?.code === 404 ||
              fcmResult.error?.details?.[0]?.errorCode === 'UNREGISTERED') {
            await supabase
              .from('push_tokens')
              .update({ is_active: false })
              .eq('token', tokenData.token);
          }
        }
      } catch (err) {
        failed++;
        console.error(`❌ Erreur user ${tokenData.user_id}:`, err);
      }
    }

    console.log(`✅ Promo "${formation.title}": ${sent} envoyées, ${failed} échecs`);

    return new Response(
      JSON.stringify({
        success: true,
        formation: formation.title,
        sent,
        failed,
        excluded: enrolledUserIds.size,
        total_eligible: eligibleTokens.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Erreur send-formation-promo:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
