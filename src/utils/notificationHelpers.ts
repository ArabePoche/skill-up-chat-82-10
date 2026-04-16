import { supabase } from '@/integrations/supabase/client';
import { NotificationSoundService } from '@/services/NotificationSoundService';

// Types pour les notifications
export type NotificationType =
  | 'daily_reminder'
  | 'teacher_response'
  | 'exercise_validation'
  | 'new_lesson'
  | 'new_video'
  | 'live_started'
  | 'incoming_call'
  | 'test'
  | 'private_chat'
  | 'gift_received'
  | 'gift_claim'
  | 'gift_claim_decision'
  | 'solidarity_campaign'
  | 'solidarity_contribution'
  | 'solidarity_like'
  | 'solidarity_testimonial'
  | 'marketplace_order'
  | 'marketplace_sale'
  | 'marketplace_refund';

export interface SendNotificationParams {
  userIds?: string[];
  title: string;
  message?: string;
  type: NotificationType;
  clickAction?: string;
  data?: Record<string, any>;
  playLocalSound?: boolean;
}

// Fonction helper pour envoyer des notifications
export const sendPushNotification = async (params: SendNotificationParams) => {
  try {
    // S'assurer que clickAction est aussi dans data pour l'edge function
    const body = {
      ...params,
      data: {
        ...(params.data || {}),
        clickAction: params.clickAction || '/',
      },
    };
    const { data, error } = await supabase.functions.invoke('send-push-notification', {
      body,
    });

    if (error) {
      console.error('Erreur lors de l\'envoi de notification:', error);
      throw error;
    }

    // Jouer le son approprié selon le type de notification
    if (params.playLocalSound !== false) {
      const soundType = NotificationSoundService.getSoundTypeFromNotification(params.type);
      await NotificationSoundService.playNotificationSound(soundType);
    }

    console.log('Notification envoyée avec succès:', data);
    return data;
  } catch (error) {
    console.error('Erreur dans sendPushNotification:', error);
    throw error;
  }
};

// Notifications déclenchées par les actions utilisateur
export const NotificationTriggers = {
  // Quand un exercice est validé
  onExerciseValidated: async (studentId: string, exerciseTitle: string) => {
    await sendPushNotification({
      userIds: [studentId],
      title: "🎉 Exercice validé !",
      message: `Votre exercice "${exerciseTitle}" a été validé !`,
      type: "exercise_validation",
      clickAction: "/cours",
      data: { exerciseTitle }
    });
  },

  // Quand un prof répond à un étudiant
  onTeacherResponse: async (studentId: string, teacherName: string, lessonTitle: string) => {
    await sendPushNotification({
      userIds: [studentId],
      title: "💬 Réponse de votre professeur",
      message: `${teacherName} a répondu dans "${lessonTitle}"`,
      type: "teacher_response",
      clickAction: "/cours",
      data: { teacherName, lessonTitle }
    });
  },

  // Quand une nouvelle leçon est débloquée
  onNewLessonUnlocked: async (studentId: string, lessonTitle: string) => {
    await sendPushNotification({
      userIds: [studentId],
      title: "🆕 Nouvelle leçon débloquée !",
      message: `"${lessonTitle}" est maintenant disponible`,
      type: "new_lesson",
      clickAction: "/cours",
      data: { lessonTitle }
    });
  },

  // Rappel quotidien (à utiliser avec un cron job)
  sendDailyReminders: async () => {
    try {
      const { data, error } = await supabase.functions.invoke('send-daily-reminders');

      if (error) {
        console.error('Erreur lors de l\'envoi des rappels quotidiens:', error);
        throw error;
      }

      console.log('Rappels quotidiens envoyés:', data);
      return data;
    } catch (error) {
      console.error('Erreur dans sendDailyReminders:', error);
      throw error;
    }
  },

  // Quand quelqu'un like une vidéo
  onVideoLiked: async (videoId: string, likerUserId: string, likerName: string) => {
    const { data: video } = await supabase
      .from('videos')
      .select('author_id, title')
      .eq('id', videoId)
      .single();

    if (video && video.author_id !== likerUserId) {
      await sendPushNotification({
        userIds: [video.author_id],
        title: "❤️ Nouveau like !",
        message: `${likerName} a aimé votre vidéo${video.title ? ` "${video.title}"` : ''}`,
        type: "test",
        clickAction: `/video/${videoId}`,
        data: { videoId, likerUserId }
      });
    }
  },

  // Quand quelqu'un commente une vidéo
  onVideoCommented: async (videoId: string, commenterUserId: string, commenterName: string) => {
    const { data: video } = await supabase
      .from('videos')
      .select('author_id, title')
      .eq('id', videoId)
      .single();

    if (video && video.author_id !== commenterUserId) {
      await sendPushNotification({
        userIds: [video.author_id],
        title: "💬 Nouveau commentaire !",
        message: `${commenterName} a commenté votre vidéo${video.title ? ` "${video.title}"` : ''}`,
        type: "test",
        clickAction: `/video/${videoId}`,
        data: { videoId, commenterUserId }
      });
    }
  },

  // Quand un utilisateur publie une nouvelle video
  onVideoPublished: async (recipientIds: string[], videoId: string, authorName: string, videoTitle?: string | null) => {
    if (recipientIds.length === 0) {
      return;
    }

    await sendPushNotification({
      userIds: recipientIds,
      title: 'Nouvelle video publiee',
      message: `${authorName} a publie une nouvelle video${videoTitle ? ` : "${videoTitle}"` : ''}`,
      type: 'new_video',
      clickAction: `/video/${videoId}`,
      data: { videoId, authorName, videoTitle }
    });
  },

  onLiveStarted: async (recipientIds: string[], liveStreamId: string, authorName: string, liveTitle?: string | null) => {
    if (recipientIds.length === 0) {
      return;
    }

    await sendPushNotification({
      userIds: recipientIds,
      title: 'Live en direct',
      message: `${authorName} a lance un live${liveTitle ? ` : "${liveTitle}"` : ''}`,
      type: 'live_started',
      clickAction: `/live/${liveStreamId}`,
      data: { liveStreamId, authorName, liveTitle }
    });
  },

  // Quand quelqu'un like un post
  onPostLiked: async (postId: string, likerUserId: string, likerName: string) => {
    const { data: post } = await supabase
      .from('posts')
      .select('author_id, content')
      .eq('id', postId)
      .single();

    if (post && post.author_id !== likerUserId) {
      const preview = post.content?.substring(0, 50) || '';
      await sendPushNotification({
        userIds: [post.author_id],
        title: "❤️ Nouveau like !",
        message: `${likerName} a aimé votre post${preview ? ` "${preview}..."` : ''}`,
        type: "test",
        clickAction: `/post/${postId}`,
        data: { postId, likerUserId }
      });
    }
  },

  // Quand une nouvelle commande est passée (notifier le vendeur)
  onNewMarketplaceOrder: async (sellerId: string, productTitle: string, scAmount: number, orderId: string, buyerName?: string) => {
    const name = buyerName || "Quelqu'un";
    await sendPushNotification({
      userIds: [sellerId],
      title: "🛒 Nouvelle commande !",
      message: `${name} a acheté "${productTitle}" pour ${scAmount} SC. Le paiement est sécurisé.`,
      type: "marketplace_order",
      clickAction: "/my-orders",
      playLocalSound: false,
      data: { orderId, productTitle },
    });
  },

  // Quand le paiement est libéré au vendeur (confirmation ou libération automatique)
  onOrderPaymentReleased: async (sellerId: string, productTitle: string, sellerAmount: number, orderId: string) => {
    await sendPushNotification({
      userIds: [sellerId],
      title: "💰 Paiement reçu !",
      message: `${sellerAmount} SC ont été crédités sur votre portefeuille pour "${productTitle}".`,
      type: "marketplace_sale",
      clickAction: "/my-orders",
      playLocalSound: false,
      data: { orderId, productTitle },
    });
  },

  // Quand un litige est résolu en faveur de l'acheteur (remboursement)
  onDisputeRefunded: async (buyerId: string, sellerId: string, productTitle: string, scAmount: number, orderId: string, adminNotes?: string) => {
    const buyerMessage = adminNotes
      ? `Litige résolu : "${productTitle}" — ${scAmount} SC remboursés. Note admin : ${adminNotes}`
      : `Litige résolu : "${productTitle}" — ${scAmount} SC ont été remboursés sur votre portefeuille.`;
      
    // Notifier l'acheteur
    await sendPushNotification({
      userIds: [buyerId],
      title: "✅ Remboursement effectué !",
      message: buyerMessage,
      type: "marketplace_refund",
      clickAction: "/my-orders",
      playLocalSound: false,
      data: { orderId, productTitle },
    });

    // Notifier le vendeur
    const sellerMessage = adminNotes
      ? `Litige résolu en faveur de l'acheteur pour "${productTitle}". Note admin : ${adminNotes}`
      : `Le litige pour "${productTitle}" a été résolu en faveur de l'acheteur (Remboursé).`;

    await sendPushNotification({
      userIds: [sellerId],
      title: "⚠️ Litige clôturé",
      message: sellerMessage,
      type: "marketplace_refund",
      clickAction: "/my-orders",
      playLocalSound: false,
      data: { orderId, productTitle },
    });
  },

  // Quand un litige est résolu en faveur du vendeur (libération du paiement)
  onDisputeReleased: async (sellerId: string, buyerId: string, productTitle: string, sellerAmount: number, orderId: string, adminNotes?: string) => {
    const sellerMessage = adminNotes
      ? `Litige résolu : "${productTitle}" — ${sellerAmount} SC libérés. Note admin : ${adminNotes}`
      : `Litige résolu : "${productTitle}" — ${sellerAmount} SC ont été crédités sur votre portefeuille.`;
      
    // Notifier le vendeur
    await sendPushNotification({
      userIds: [sellerId],
      title: "💰 Paiement libéré après litige !",
      message: sellerMessage,
      type: "marketplace_sale",
      clickAction: "/my-orders",
      playLocalSound: false,
      data: { orderId, productTitle },
    });

    // Notifier l'acheteur
    const buyerMessage = adminNotes
      ? `Litige clôturé en faveur du vendeur pour "${productTitle}". Note admin : ${adminNotes}`
      : `Le litige pour "${productTitle}" a été clôturé en faveur du vendeur (Paiement validé).`;

    await sendPushNotification({
      userIds: [buyerId],
      title: "⚠️ Litige clôturé",
      message: buyerMessage,
      type: "marketplace_sale",
      clickAction: "/my-orders",
      playLocalSound: false,
      data: { orderId, productTitle },
    });
  },

  // Quand le vendeur marque la commande comme expédiée (notifier l'acheteur)
  onOrderShipped: async (buyerId: string, productTitle: string, trackingNumber: string, orderId: string) => {
    await sendPushNotification({
      userIds: [buyerId],
      title: "📦 Commande expédiée !",
      message: `"${productTitle}" est en route. Numéro de suivi : ${trackingNumber}`,
      type: "marketplace_order",
      clickAction: "/my-orders",
      playLocalSound: false,
      data: { orderId, productTitle, trackingNumber },
    });
  },

  // Quand une réclamation d'annulation de cadeau est créée (notifier le destinataire)
  onGiftClaimCreated: async (recipientId: string, amount: number, currency: string) => {
    const currencyLabel = currency === 'soumboulah_cash' ? 'SC' : 'SB';
    await sendPushNotification({
      userIds: [recipientId],
      title: "⚠️ Fonds bloqués",
      message: `${amount.toLocaleString('fr-FR')} ${currencyLabel} de votre portefeuille ont été temporairement bloqués suite à une réclamation d'annulation de cadeau. Un administrateur va examiner le dossier.`,
      type: "gift_claim",
      clickAction: "/wallet",
      playLocalSound: false,
    });
  },

  // Quand une réclamation d'annulation de cadeau est décidée (notifier l'expéditeur et le destinataire)
  onGiftClaimDecision: async (
    senderId: string,
    recipientId: string,
    action: 'approve' | 'reject',
    amount: number,
    currency: string,
    adminNotes?: string
  ) => {
    const currencyLabel = currency === 'soumboulah_cash' ? 'SC' : 'SB';
    const notesSuffix = adminNotes ? ` Note : ${adminNotes}` : '';

    if (action === 'approve') {
      // Expéditeur : remboursé
      await sendPushNotification({
        userIds: [senderId],
        title: "✅ Réclamation approuvée",
        message: `Votre réclamation a été approuvée. Vous avez été remboursé(e) de ${amount.toLocaleString('fr-FR')} ${currencyLabel}.${notesSuffix}`,
        type: "gift_claim_decision",
        clickAction: "/wallet",
        playLocalSound: false,
      });
      // Destinataire : fonds prélevés
      await sendPushNotification({
        userIds: [recipientId],
        title: "⚠️ Réclamation acceptée",
        message: `La réclamation concernant votre cadeau de ${amount.toLocaleString('fr-FR')} ${currencyLabel} a été acceptée. Les fonds bloqués ont été restitués à l'expéditeur.${notesSuffix}`,
        type: "gift_claim_decision",
        clickAction: "/wallet",
        playLocalSound: false,
      });
    } else {
      // Expéditeur : réclamation rejetée
      await sendPushNotification({
        userIds: [senderId],
        title: "❌ Réclamation rejetée",
        message: `Votre réclamation pour ${amount.toLocaleString('fr-FR')} ${currencyLabel} a été rejetée. Les fonds ont été restitués au destinataire.${notesSuffix}`,
        type: "gift_claim_decision",
        clickAction: "/wallet",
        playLocalSound: false,
      });
      // Destinataire : fonds débloqués
      await sendPushNotification({
        userIds: [recipientId],
        title: "✅ Fonds débloqués",
        message: `La réclamation concernant votre cadeau de ${amount.toLocaleString('fr-FR')} ${currencyLabel} a été rejetée. Vos fonds vous ont été restitués.${notesSuffix}`,
        type: "gift_claim_decision",
        clickAction: "/wallet",
        playLocalSound: false,
      });
    }
  },
};

// Fonction pour tester les notifications
export const testNotification = async (userId: string) => {
  return await sendPushNotification({
    userIds: [userId],
    title: "🎯 Test de notification",
    message: "Super ! Vos notifications fonctionnent parfaitement. Prêt à apprendre ?",
    type: "test",
    clickAction: "/",
    data: { isTest: true }
  });
};