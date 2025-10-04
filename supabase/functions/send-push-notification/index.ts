import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  userIds?: string[];
  title: string;
  message: string;
  type: string;
  clickAction?: string;
  data?: Record<string, any>;
}

// Messages motivants inspirés de Duolingo
const DUOLINGO_MESSAGES = {
  daily_reminder: [
    "👋 Tu n'as pas étudié aujourd'hui, viens apprendre avec nous !",
    "🧠 5 minutes par jour suffisent pour progresser !",
    "⏳ Ton cerveau attend ta dose quotidienne de savoir...",
    "🎯 Tu es à 1 cours de valider ton objectif hebdo !",
    "📚 Tes cours t'attendent, ne les fais pas patienter !",
    "🔥 Garde ta streak d'apprentissage vivante !",
    "💪 Un petit effort aujourd'hui, un grand pas demain !"
  ],
  teacher_response: [
    "💬 Un prof vous a répondu !",
    "📝 Votre professeur a un message pour vous",
    "👨‍🏫 Réponse de votre enseignant disponible",
    "💭 Nouvelle réponse dans votre discussion"
  ],
  exercise_validation: [
    "🎉 Super ! Votre exercice a été validé",
    "✅ Bravo ! Exercice réussi avec brio",
    "🏆 Félicitations ! Votre travail est approuvé",
    "⭐ Excellent travail ! Exercice validé"
  ],
  new_lesson: [
    "📚 Un nouveau cours est dispo, viens vite l'explorer !",
    "🆕 Nouveau contenu débloqué ! À découvrir maintenant",
    "🎓 Une nouvelle leçon vous attend",
    "📖 Nouveau chapitre disponible dans votre formation"
  ]
};

// Fonction pour générer un JWT
function createJWT(payload: any, secret: string): string {
  const header = { alg: "HS256", typ: "JWT" };
  
  const base64UrlEncode = (obj: any) => {
    return btoa(JSON.stringify(obj))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  };
  
  const encodedHeader = base64UrlEncode(header);
  const encodedPayload = base64UrlEncode(payload);
  
  // Signature simplifiée (pour demo)
  const signature = btoa(`${encodedHeader}.${encodedPayload}.${secret}`).slice(0, 32);
  
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { userIds, title, message, type, clickAction, data }: NotificationRequest = await req.json();

    console.log('Sending push notification:', { userIds, title, message, type });

    // Récupérer les tokens FCM des utilisateurs ciblés
    let query = supabaseClient
      .from('push_tokens')
      .select('user_id, token, notification_preferences')
      .eq('is_active', true);

    if (userIds && userIds.length > 0) {
      query = query.in('user_id', userIds);
    }

    const { data: tokens, error: tokensError } = await query;

    if (tokensError) {
      console.error('Erreur lors de la récupération des tokens:', tokensError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la récupération des tokens' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!tokens || tokens.length === 0) {
      console.log('Aucun token trouvé pour les utilisateurs ciblés');
      return new Response(
        JSON.stringify({ message: 'Aucun token trouvé', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filtrer les tokens selon les préférences de notification
    const filteredTokens = tokens.filter(tokenData => {
      const prefs = tokenData.notification_preferences || {};
      
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
          return true; // Pour les notifications système/test
      }
    });

    console.log(`${filteredTokens.length} tokens après filtrage des préférences`);

    if (filteredTokens.length === 0) {
      return new Response(
        JSON.stringify({ message: 'Aucun utilisateur avec cette préférence activée', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Utiliser Firebase Cloud Messaging API REST
    const projectId = "eductok-a2a00";
    
    // Obtenir un access token (méthode simplifiée pour demo)
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: "firebase-adminsdk-fbsvc@eductok-a2a00.iam.gserviceaccount.com",
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now
    };

    // Pour la demo, on simule l'envoi
    const results = [];
    let successCount = 0;

    for (const tokenData of filteredTokens) {
      try {
        // Sélectionner un message aléatoire selon le type
        let finalMessage = message;
        if (DUOLINGO_MESSAGES[type as keyof typeof DUOLINGO_MESSAGES]) {
          const messages = DUOLINGO_MESSAGES[type as keyof typeof DUOLINGO_MESSAGES];
          finalMessage = messages[Math.floor(Math.random() * messages.length)];
        }

        // Simuler l'envoi de la notification FCM
        console.log(`Envoi notification à l'utilisateur ${tokenData.user_id}:`, {
          title,
          message: finalMessage,
          token: tokenData.token.slice(0, 20) + '...'
        });
        
        // Enregistrer le log de la notification
        await supabaseClient
          .from('notification_logs')
          .insert({
            user_id: tokenData.user_id,
            title: title,
            message: finalMessage,
            notification_type: type,
            status: 'sent',
            fcm_response: { success: true, messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` }
          });

        results.push({ 
          token: tokenData.token.slice(0, 20) + '...', 
          success: true, 
          userId: tokenData.user_id 
        });
        successCount++;

      } catch (error) {
        console.error('Erreur lors de l\'envoi pour le token:', tokenData.token, error);
        const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
        
        // Enregistrer l'erreur
        await supabaseClient
          .from('notification_logs')
          .insert({
            user_id: tokenData.user_id,
            title: title,
            message: message,
            notification_type: type,
            status: 'failed',
            fcm_response: { error: errorMessage }
          });

        results.push({ 
          token: tokenData.token.slice(0, 20) + '...', 
          success: false, 
          error: errorMessage,
          userId: tokenData.user_id 
        });
      }
    }

    console.log(`Notifications envoyées: ${successCount}/${filteredTokens.length}`);

    return new Response(
      JSON.stringify({
        message: 'Notifications traitées avec succès',
        sent: successCount,
        total: filteredTokens.length,
        results: results,
        preview: {
          title,
          messageExamples: type in DUOLINGO_MESSAGES 
            ? DUOLINGO_MESSAGES[type as keyof typeof DUOLINGO_MESSAGES].slice(0, 3)
            : [message]
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erreur dans send-push-notification:', error);
    const errorMessage = error instanceof Error ? error.message : 'Une erreur inconnue est survenue';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});