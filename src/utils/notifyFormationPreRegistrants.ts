import { supabase } from '@/integrations/supabase/client';

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data: preRegistrations, error: preRegistrationsError } = await db
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
  const userIds = preRegistrations.map((registration: { user_id: string }) => registration.user_id);

  const notifications = userIds.map((userId: string) => ({
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

  const { error: updateError } = await db
    .from('formation_pre_registrations')
    .update({ notified_at: now })
    .in('id', preRegistrations.map((registration: { id: string }) => registration.id));

  if (updateError) {
    throw updateError;
  }

  return { notifiedCount: userIds.length };
};
