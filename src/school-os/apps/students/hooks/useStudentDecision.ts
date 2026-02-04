// Hook pour gérer les décisions concernant les élèves (promotion, transfert, exclusion)
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type DecisionType = 'promotion' | 'demotion' | 'transfer' | 'exclusion';

export interface StudentDecision {
  student_id: string;
  decision_type: DecisionType;
  target_class_id?: string | null;
  target_school_id?: string | null;
  target_school_name?: string | null;
  comment?: string | null;
  decided_by: string;
}

// Hook pour récupérer toutes les écoles disponibles
export const useAllSchools = () => {
  return useQuery({
    queryKey: ['all-schools'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schools')
        .select('id, name, city, country')
        .order('name', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });
};

// Hook pour appliquer une décision sur un élève
export const useApplyStudentDecision = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (decision: StudentDecision) => {
      const { student_id, decision_type, target_class_id, target_school_id, target_school_name, comment } = decision;

      // Récupérer les informations actuelles de l'élève
      const { data: student, error: studentError } = await supabase
        .from('students_school')
        .select('*, classes(name)')
        .eq('id', student_id)
        .single();

      if (studentError) throw studentError;

      let newStatus: 'active' | 'inactive' | 'transferred' = student.status as 'active' | 'inactive' | 'transferred';
      let updateData: any = {};

      switch (decision_type) {
        case 'promotion':
        case 'demotion':
          // Changer de classe
          if (!target_class_id) {
            throw new Error('Veuillez sélectionner une classe cible');
          }
          updateData = {
            class_id: target_class_id,
          };
          break;

        case 'transfer':
          // Transférer vers une autre école
          newStatus = 'transferred';
          updateData = {
            status: newStatus,
          };
          break;

        case 'exclusion':
          // Exclure définitivement
          newStatus = 'inactive';
          updateData = {
            status: newStatus,
          };
          break;
      }

      // Mettre à jour l'élève
      const { error: updateError } = await supabase
        .from('students_school')
        .update(updateData)
        .eq('id', student_id);

      if (updateError) throw updateError;

      // Enregistrer la décision dans l'historique (si la table existe)
      try {
        await supabase
          .from('student_decisions' as any)
          .insert({
            student_id,
            decision_type,
            previous_class_id: student.class_id,
            target_class_id,
            target_school_id,
            target_school_name,
            comment,
            decided_by: decision.decided_by,
          });
      } catch (historyError) {
        // Si la table n'existe pas, on continue sans erreur
        console.log('Note: student_decisions table may not exist yet');
      }

      return { student, decision_type, newStatus };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      
      let message = '';
      switch (result.decision_type) {
        case 'promotion':
          message = 'Élève promu avec succès';
          break;
        case 'demotion':
          message = 'Élève rétrogradé avec succès';
          break;
        case 'transfer':
          message = 'Élève transféré avec succès';
          break;
        case 'exclusion':
          message = 'Élève exclu avec succès';
          break;
      }
      toast.success(message);
    },
    onError: (error: any) => {
      console.error('Error applying decision:', error);
      toast.error('Erreur lors de l\'application de la décision: ' + error.message);
    },
  });
};
