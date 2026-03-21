// Service pour enregistrer les gains Habbah en base de données et mettre à jour le wallet
import { supabase } from '@/integrations/supabase/client';

/**
 * Enregistre un gain Habbah en base : 
 * 1. Insère un événement dans habbah_events
 * 2. Met à jour le solde habbah dans user_wallets
 * 3. Retourne le montant gagné (ou null si règle inactive / limite atteinte)
 */
export const recordHabbahGain = async (
  userId: string,
  actionType: string,
  referenceId?: string,
): Promise<{ amount: number; label: string } | null> => {
  try {
    // 1. Récupérer la règle active pour cette action
    const { data: rule, error: ruleError } = await supabase
      .from('habbah_earning_rules')
      .select('*')
      .eq('action_type', actionType)
      .eq('is_active', true)
      .maybeSingle();

    if (ruleError || !rule) return null;

    // 2. Vérifier la limite journalière
    const today = new Date().toISOString().split('T')[0];
    const { count: dailyCount } = await supabase
      .from('habbah_events')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('event_type', actionType)
      .gte('created_at', `${today}T00:00:00Z`);

    if ((dailyCount ?? 0) >= rule.daily_limit) {
      console.log(`Limite journalière atteinte pour ${actionType}`);
      return null;
    }

    // 3. Insérer l'événement
    const { error: insertError } = await supabase
      .from('habbah_events')
      .insert({
        user_id: userId,
        event_type: actionType,
        habbah_earned: rule.habbah_amount,
        reference_id: referenceId || null,
      });

    if (insertError) {
      console.error('Erreur insertion habbah_events:', insertError);
      return null;
    }

    // 4. Mettre à jour le wallet — d'abord vérifier s'il existe
    const { data: wallet } = await supabase
      .from('user_wallets')
      .select('id, habbah')
      .eq('user_id', userId)
      .maybeSingle();

    if (wallet) {
      await supabase
        .from('user_wallets')
        .update({ habbah: (wallet.habbah || 0) + rule.habbah_amount })
        .eq('user_id', userId);
    } else {
      await supabase
        .from('user_wallets')
        .insert({ user_id: userId, habbah: rule.habbah_amount, soumboulah_cash: 0, soumboulah_bonus: 0 });
    }

    return { amount: rule.habbah_amount, label: rule.action_label };
  } catch (error) {
    console.error('Erreur recordHabbahGain:', error);
    return null;
  }
};
