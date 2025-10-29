/**
 * Utilitaire pour initialiser automatiquement les enregistrements de streak
 */
import { supabase } from '@/integrations/supabase/client';

/**
 * Vérifie si un utilisateur a un enregistrement streak, sinon le crée
 */
export const ensureStreakRecord = async (userId: string): Promise<boolean> => {
  try {
    // Vérifier si l'enregistrement existe déjà
    const { data: existing, error: fetchError } = await supabase
      .from('user_streaks')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError) {
      console.error('❌ Erreur lors de la vérification du streak:', fetchError);
      return false;
    }

    // Si l'enregistrement existe déjà, pas besoin d'en créer un nouveau
    if (existing) {
      console.log('✅ Enregistrement streak existant pour:', userId);
      return true;
    }

    // Créer un nouvel enregistrement streak
    const today = new Date().toISOString().split('T')[0];
    const { error: insertError } = await supabase
      .from('user_streaks')
      .insert({
        user_id: userId,
        current_streak: 0,
        longest_streak: 0,
        total_days_active: 0,
        current_level: 0,
        daily_minutes: 0,
        last_activity_date: today,
        last_login_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('❌ Erreur lors de la création du streak:', insertError);
      return false;
    }

    console.log('🆕 Nouvel enregistrement streak créé pour:', userId);
    return true;
  } catch (error) {
    console.error('❌ Erreur inattendue lors de l\'initialisation du streak:', error);
    return false;
  }
};

/**
 * Met à jour la date de dernière activité de l'utilisateur
 */
export const updateLastActivity = async (userId: string): Promise<void> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { error } = await supabase
      .from('user_streaks')
      .update({ 
        last_activity_date: today,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) {
      console.error('❌ Erreur mise à jour activité:', error);
    }
  } catch (error) {
    console.error('❌ Erreur inattendue mise à jour activité:', error);
  }
};
