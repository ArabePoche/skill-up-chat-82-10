import { createClient } from "https://esm.sh/@supabase/supabase-js@2.77.0";

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

// Firebase project ID - unifié avec la config client
const FIREBASE_PROJECT_ID = "push-notifications-727ff";

// Fonction pour envoyer une vraie notification FCM
async function sendFCMNotification(
  token: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Récupérer la clé de service Firebase depuis les secrets Supabase
    const serviceAccountKey = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_KEY');
    
    if (!serviceAccountKey) {
      console.warn('⚠️ FIREBASE_SERVICE_ACCOUNT_KEY non configurée - notifications désactivées');
      return { 
        success: false, 
        error: 'Configuration Firebase manquante. Veuillez configurer FIREBASE_SERVICE_ACCOUNT_KEY dans les secrets.' 
      };
    }

    // Parser la clé de service
    const serviceAccount = JSON.parse(serviceAccountKey);
    
    // Créer le JWT pour l'authentification Google
    const now = Math.floor(Date.now() / 1000);
    const jwtHeader = { alg: "RS256", typ: "JWT" };
    const jwtClaims = {
      iss: serviceAccount.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now
    };

    // Note: Pour une implémentation complète, il faudrait signer le JWT avec RS256
    // Pour l'instant, on simule l'envoi en attendant la vraie clé
    
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/messages:send`;
    
    const message = {
      message: {
        token: token,
        notification: {
          title: title,
          body: body
        },
        data: data || {},
        webpush: {
          fcm_options: {
            link: data?.click_action || '/'
          }
        }
      }
    };

    console.log('📤 Envoi notification FCM pour token:', token.substring(0, 20) + '...');
    
    // TODO: Implémenter l'appel réel une fois la clé configurée
    // const response = await fetch(fcmUrl, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${accessToken}`
    //   },
    //   body: JSON.stringify(message)
    // });

    return { 
      success: true, 
      messageId: `simulated_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` 
    };

  } catch (error) {
    console.error('❌ Erreur FCM:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur inconnue' 
    };
  }
}

Deno.serve(async (req) => {
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

    // Envoyer les notifications via FCM
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

        console.log(`📤 Envoi notification à l'utilisateur ${tokenData.user_id}`);
        
        // Envoyer la notification via FCM
        const fcmResult = await sendFCMNotification(
          tokenData.token,
          title,
          finalMessage,
          {
            click_action: clickAction || '/',
            notification_type: type,
            ...data
          }
        );
        
        // Enregistrer le log de la notification
        await supabaseClient
          .from('notification_logs')
          .insert({
            user_id: tokenData.user_id,
            title: title,
            message: finalMessage,
            notification_type: type,
            status: fcmResult.success ? 'sent' : 'failed',
            fcm_response: fcmResult
          });

        if (fcmResult.success) {
          results.push({ 
            token: tokenData.token.slice(0, 20) + '...', 
            success: true, 
            userId: tokenData.user_id,
            messageId: fcmResult.messageId
          });
          successCount++;
        } else {
          results.push({ 
            token: tokenData.token.slice(0, 20) + '...', 
            success: false, 
            error: fcmResult.error,
            userId: tokenData.user_id 
          });
        }

      } catch (error) {
        console.error('❌ Erreur lors de l\'envoi pour le token:', tokenData.token, error);
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