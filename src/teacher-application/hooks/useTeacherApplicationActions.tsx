import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

export const useTeacherApplicationActions = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const approveApplication = async (applicationId: string, comment?: string) => {
    try {
      setIsProcessing(true);

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Non authentifié');

      const { error } = await supabase.rpc('approve_teacher_application', {
        p_application_id: applicationId,
        p_reviewer_id: userData.user.id,
        p_comment: comment || null
      });

      if (error) throw error;

      toast({
        title: "Candidature approuvée !",
        description: "Le candidat a été accepté et ajouté à l'équipe d'encadreurs.",
      });

      // Rafraîchir les données
      queryClient.invalidateQueries({ queryKey: ['teacher-applications'] });
      queryClient.invalidateQueries({ queryKey: ['pending-teacher-applications-count'] });

    } catch (error: any) {
      console.error('Erreur lors de l\'approbation:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'approuver la candidature",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  const rejectApplication = async (applicationId: string, comment: string) => {
    try {
      setIsProcessing(true);

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Non authentifié');

      const { error } = await supabase.rpc('reject_teacher_application', {
        p_application_id: applicationId,
        p_reviewer_id: userData.user.id,
        p_comment: comment
      });

      if (error) throw error;

      toast({
        title: "Candidature rejetée",
        description: "Le candidat a été notifié de la décision.",
      });

      // Rafraîchir les données
      queryClient.invalidateQueries({ queryKey: ['teacher-applications'] });
      queryClient.invalidateQueries({ queryKey: ['pending-teacher-applications-count'] });

    } catch (error: any) {
      console.error('Erreur lors du rejet:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de rejeter la candidature",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    approveApplication,
    rejectApplication,
    isProcessing
  };
};