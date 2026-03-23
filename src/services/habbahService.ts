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
    // Appel de la fonction RPC sécurisée (gère les règles, le cooldown, et l'insertion en 1 requête)
    const { data, error } = await supabase.rpc('earn_habbah', {
      p_action_type: actionType,
      p_reference_id: referenceId || null,
    });

    if (error) {
       console.error('Erreur RPC earn_habbah:', error);
       return null;
    }

    // Le backend renvoie un objet JSON { success: boolean, amount?: number, label?: string, message?: string }
    const result = data as any;

    if (result && result.success) {
      return { amount: result.amount, label: result.label };
    }

    // Si success est false (cooldown, limite atteinte, règle inactive), on ne fait rien
    // console.log(`Habbah gain failed/skipped: ${result?.message}`);
    return null;

  } catch (error) {
    console.error('Erreur recordHabbahGain:', error);
    return null;
  }
};

/**
 * Transfère des Habbah à un autre utilisateur
 */
export const transferHabbah = async (
  recipientId: string,
  amount: number,
  reason: string = 'gift',
  referenceId?: string
): Promise<{ success: boolean; message: string; newBalance?: number }> => {
  try {
    const { data, error } = await supabase.rpc('transfer_habbah', {
      p_recipient_id: recipientId,
      p_amount: amount,
      p_reason: reason, 
      p_reference_id: referenceId
    });

    if (error) {
      console.error('Erreur RPC transfer_habbah:', error);
      return { success: false, message: error.message };
    }

    const result = data as any;
    return {
      success: result.success,
      message: result.message,
      newBalance: result.new_balance
    };
  } catch (error: any) {
    console.error('Erreur transferHabbah:', error);
    return { success: false, message: error.message || 'Erreur inconnue' };
  }
};
