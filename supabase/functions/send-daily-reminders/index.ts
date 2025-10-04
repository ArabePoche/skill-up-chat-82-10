import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🔔 Démarrage de l\'envoi des rappels quotidiens...');

    // Récupérer tous les utilisateurs actifs avec des notifications activées
    const { data: activeUsers, error: usersError } = await supabaseClient
      .from('push_tokens')
      .select('user_id, notification_preferences')
      .eq('is_active', true);

    if (usersError) {
      console.error('Erreur lors de la récupération des utilisateurs:', usersError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la récupération des utilisateurs' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filtrer ceux qui ont activé les rappels quotidiens
    const usersWithDailyReminders = activeUsers?.filter(user => {
      const prefs = user.notification_preferences || {};
      return prefs.daily_reminders !== false;
    }) || [];

    if (usersWithDailyReminders.length === 0) {
      console.log('Aucun utilisateur avec les rappels quotidiens activés');
      return new Response(
        JSON.stringify({ message: 'Aucun utilisateur ciblé', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📱 ${usersWithDailyReminders.length} utilisateurs ciblés pour les rappels`);

    // Envoyer les notifications via l'edge function principale
    const notificationResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-push-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
      },
      body: JSON.stringify({
        userIds: usersWithDailyReminders.map(u => u.user_id),
        title: "🎯 Votre dose d'apprentissage quotidienne !",
        message: "Message personnalisé généré automatiquement",
        type: "daily_reminder",
        clickAction: "/cours"
      })
    });

    const notificationResult = await notificationResponse.json();

    console.log('✅ Résultat de l\'envoi des rappels:', notificationResult);

    return new Response(
      JSON.stringify({
        message: 'Rappels quotidiens envoyés avec succès',
        targetedUsers: usersWithDailyReminders.length,
        result: notificationResult
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erreur dans send-daily-reminders:', error);
    const errorMessage = error instanceof Error ? error.message : 'Une erreur inconnue est survenue';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});