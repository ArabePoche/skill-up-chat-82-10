import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

type PendingFormationPreRegistration = Pick<Tables<'formation_pre_registrations'>, 'id' | 'user_id'>;

export const notifyFormationPreRegistrants = async (formationId: string) => {
  if (!formationId) {
    return { notifiedCount: 0 };
  }

  const { data: formation, error: formationError } = await supabase
    .from('formations')
    .select('id, title, is_active')
    .eq('id', formationId)
    .single();

  if (formationError) {
    throw formationError;
  }

  if (!formation?.is_active) {
    return { notifiedCount: 0 };
  }

  const { data: preRegistrations, error: preRegistrationsError } = await supabase
    .from('formation_pre_registrations')
    .select('id, user_id')
    .eq('formation_id', formationId)
    .is('notified_at', null);

  if (preRegistrationsError) {
    throw preRegistrationsError;
  }

  if (!preRegistrations?.length) {
    return { notifiedCount: 0 };
  }

  const now = new Date().toISOString();
  const title = '🎉 Formation disponible';
  const message = `La formation "${formation.title}" est maintenant disponible. Vous pouvez finaliser votre inscription.`;
  const pendingPreRegistrations: PendingFormationPreRegistration[] = preRegistrations || [];
  const userIds = pendingPreRegistrations.map((registration) => registration.user_id);

  const notifications: TablesInsert<'notifications'>[] = userIds.map((userId) => ({
    user_id: userId,
    formation_id: formationId,
    title,
    message,
    type: 'formation_available',
    is_read: false,
  }));

  const { error: notificationsError } = await supabase
    .from('notifications')
    .insert(notifications);

  if (notificationsError) {
    throw notificationsError;
  }

  const { error: pushError } = await supabase.functions.invoke('send-push-notification', {
    body: {
      userIds,
      title,
      message,
      type: 'formation_available',
      data: {
        clickAction: `/formation/${formationId}`,
        formationId,
      },
    },
  });

  if (pushError) {
    console.error('Error sending pre-registration push notifications:', pushError);
  }

  const { error: updateError } = await supabase
    .from('formation_pre_registrations')
    .update({ notified_at: now })
    .in('id', pendingPreRegistrations.map((registration) => registration.id));

  if (updateError) {
    throw updateError;
  }

  return { notifiedCount: userIds.length };
};
