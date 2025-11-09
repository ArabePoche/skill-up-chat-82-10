import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationPayload {
  userIds: string[];
  title: string;
  message: string;
  type?: string;
  data?: Record<string, string>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const fcmServerKey = Deno.env.get('FCM_SERVER_KEY');

    if (!fcmServerKey) {
      throw new Error('FCM_SERVER_KEY non configurée');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const payload: NotificationPayload = await req.json();

    console.log('📨 Envoi de notification push:', {
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

    let sent = 0;
    let failed = 0;

    // Envoyer via FCM pour chaque token
    for (const tokenData of tokens) {
      try {
        const fcmResponse = await fetch('https://fcm.googleapis.com/fcm/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `key=${fcmServerKey}`,
          },
          body: JSON.stringify({
            to: tokenData.token,
            notification: {
              title: payload.title,
              body: payload.message,
              icon: '/icon-192.png',
              badge: '/badge-72.png',
            },
            data: payload.data || {},
          }),
        });

        const fcmResult = await fcmResponse.json();

        if (fcmResponse.ok) {
          sent++;
        } else {
          failed++;
          console.error(`❌ Erreur FCM pour user ${tokenData.user_id}:`, fcmResult);
          
          // Si le token est invalide, désactiver dans la base
          if (fcmResult.results?.[0]?.error === 'InvalidRegistration' || 
              fcmResult.results?.[0]?.error === 'NotRegistered') {
            await supabase
              .from('push_tokens')
              .update({ is_active: false })
              .eq('token', tokenData.token);
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
