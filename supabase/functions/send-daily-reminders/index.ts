import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    console.log('🔔 Début de l\'envoi des rappels quotidiens');

    // Récupérer tous les tokens actifs avec préférence daily_reminders activée
    const { data: tokens, error } = await supabase
      .from('push_tokens')
      .select('user_id, token, notification_preferences')
      .eq('is_active', true);

    if (error) {
      throw error;
    }

    if (!tokens || tokens.length === 0) {
      console.log('ℹ️ Aucun token actif trouvé');
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'Aucun token actif' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filtrer les utilisateurs qui ont activé les rappels quotidiens
    const eligibleTokens = tokens.filter(t => {
      const prefs = t.notification_preferences as any;
      return prefs?.daily_reminders === true;
    });

    console.log(`📊 ${eligibleTokens.length} utilisateurs éligibles sur ${tokens.length}`);

    let sent = 0;
    let failed = 0;

    // Envoyer les notifications
    for (const tokenData of eligibleTokens) {
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
              title: '📚 Continuez votre apprentissage !',
              body: 'Prenez quelques minutes aujourd\'hui pour progresser dans vos cours.',
              icon: '/icon-192.png',
              badge: '/badge-72.png',
            },
            data: {
              type: 'daily_reminder',
              url: '/student-dashboard',
            },
          }),
        });

        const fcmResult = await fcmResponse.json();

        if (fcmResponse.ok) {
          sent++;
        } else {
          failed++;
          console.error(`❌ Échec pour user ${tokenData.user_id}:`, fcmResult);

          // Désactiver les tokens invalides
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

    console.log(`✅ Rappels envoyés: ${sent}, Échecs: ${failed}`);

    return new Response(
      JSON.stringify({ success: true, sent, failed, total: eligibleTokens.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi des rappels:', error);
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
