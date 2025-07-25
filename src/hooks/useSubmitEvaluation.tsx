
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SubmitEvaluationData {
  evaluationId: string;
  isSatisfied: boolean;
  rating?: number;
  wantsSameTeacher: boolean;
}

export const useSubmitEvaluation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SubmitEvaluationData) => {
      console.log('📋 Starting evaluation submission:', data);

      // 1. Récupérer les détails de l'évaluation
      const { data: evaluation, error: fetchError } = await supabase
        .from('interview_evaluations')
        .select(`
          *,
          teachers (
            id,
            user_id
          )
        `)
        .eq('id', data.evaluationId)
        .single();

      if (fetchError) {
        console.error('❌ Error fetching evaluation:', fetchError);
        throw new Error('Erreur lors de la récupération de l\'évaluation: ' + fetchError.message);
      }

      if (!evaluation) {
        throw new Error('Évaluation introuvable');
      }

      console.log('✅ Evaluation found:', evaluation);

      // 2. Mettre à jour l'évaluation avec la réponse de l'étudiant
      const { error: updateError } = await supabase
        .from('interview_evaluations')
        .update({
          is_satisfied: data.isSatisfied,
          satisfaction_rating: data.isSatisfied ? data.rating : null,
          teacher_rating: data.isSatisfied ? data.rating : null,
          wants_same_teacher: data.wantsSameTeacher,
          responded_at: new Date().toISOString()
        })
        .eq('id', data.evaluationId);

      if (updateError) {
        console.error('❌ Error updating evaluation:', updateError);
        throw new Error('Erreur lors de la mise à jour: ' + updateError.message);
      }

      console.log('✅ Evaluation updated successfully');

      // 3. Si l'évaluation est satisfaisante, traiter la rémunération du professeur
      if (data.isSatisfied && evaluation.teacher_id) {
        console.log('💰 Processing teacher payment for satisfied evaluation');

        try {
          // Récupérer les règles de tarification pour ce professeur
          const { data: pricingRule, error: pricingError } = await supabase
            .from('teacher_pricing_rules')
            .select('*')
            .eq('teacher_id', evaluation.teacher_id)
            .eq('formation_id', evaluation.formation_id)
            .eq('is_active', true)
            .single();

          if (pricingError && pricingError.code !== 'PGRST116') {
            console.warn('⚠️ No specific pricing rule found for teacher/formation, trying general rule');
            // Essayer de récupérer une règle générale pour ce professeur
            const { data: generalRule, error: generalError } = await supabase
              .from('teacher_pricing_rules')
              .select('*')
              .eq('teacher_id', evaluation.teacher_id)
              .is('formation_id', null)
              .eq('is_active', true)
              .single();

            if (generalError && generalError.code !== 'PGRST116') {
              console.error('❌ No pricing rule found for teacher:', generalError);
              throw new Error('Aucune règle de tarification trouvée pour ce professeur');
            }
            
            if (generalRule && generalRule.entretien_satisfait_price > 0) {
              console.log('✅ Using general pricing rule:', generalRule);
              await processTeacherPayment(evaluation.teacher_id, generalRule.entretien_satisfait_price, evaluation.id);
            }
          } else if (pricingRule && pricingRule.entretien_satisfait_price > 0) {
            console.log('✅ Pricing rule found:', pricingRule);
            await processTeacherPayment(evaluation.teacher_id, pricingRule.entretien_satisfait_price, evaluation.id);
          }

        } catch (paymentError) {
          console.error('❌ Error processing teacher payment:', paymentError);
          // Ne pas faire échouer toute l'opération pour une erreur de paiement
          toast.warning('Évaluation enregistrée mais erreur lors du paiement du professeur');
        }
      }

      return evaluation;
    },
    onSuccess: () => {
      console.log('🎉 Evaluation submitted successfully');
      toast.success('Merci pour votre évaluation! 🙏');
      queryClient.invalidateQueries({ queryKey: ['student-evaluations'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-wallet'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-transactions'] });
    },
    onError: (error: Error) => {
      console.error('❌ Error submitting evaluation:', error);
      toast.error('Erreur lors de l\'envoi de l\'évaluation: ' + error.message);
    },
  });
};

// Fonction utilitaire pour traiter le paiement du professeur via la fonction database
async function processTeacherPayment(teacherId: string, amount: number, evaluationId: string) {
  console.log(`💳 Processing payment: ${amount}€ for teacher ${teacherId}`);
  
  // Utiliser la fonction database process_teacher_payment
  const { error } = await supabase.rpc('process_teacher_payment', {
    p_teacher_id: teacherId,
    p_transaction_type: 'interview_payment',
    p_amount: amount,
    p_reference_id: evaluationId,
    p_description: `Paiement entretien satisfait - Évaluation ${evaluationId}`
  });

  if (error) {
    console.error('❌ Error calling process_teacher_payment:', error);
    throw new Error('Erreur lors du traitement du paiement: ' + error.message);
  }

  console.log('💰 Payment processing completed successfully');
}
