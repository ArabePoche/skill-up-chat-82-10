// Hook pour la gestion de la file d'attente des soumissions d'élèves
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface StudentSubmission {
  id: string;
  studentId: string;
  studentName: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  submittedAt: Date;
  status: 'pending' | 'accepted' | 'rejected';
}

export const useSubmissionQueue = (formationId: string, lessonId: string) => {
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const acceptSubmission = useCallback(async (submissionId: string) => {
    setIsLoading(true);
    try {
      setSubmissions(prev =>
        prev.map(sub =>
          sub.id === submissionId
            ? { ...sub, status: 'accepted' as const }
            : sub
        )
      );

      toast.success('Soumission acceptée et affichée');
    } catch (error) {
      console.error('Erreur lors de l\'acceptation:', error);
      toast.error('Erreur lors de l\'acceptation de la soumission');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const rejectSubmission = useCallback(async (submissionId: string) => {
    setIsLoading(true);
    try {
      setSubmissions(prev =>
        prev.map(sub =>
          sub.id === submissionId
            ? { ...sub, status: 'rejected' as const }
            : sub
        )
      );

      toast.info('Soumission rejetée');
    } catch (error) {
      console.error('Erreur lors du rejet:', error);
      toast.error('Erreur lors du rejet de la soumission');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearSubmissions = useCallback(() => {
    setSubmissions([]);
  }, []);

  // Simuler l'ajout de nouvelles soumissions (à remplacer par un système real-time)
  const addSubmission = useCallback((submission: Omit<StudentSubmission, 'id' | 'submittedAt' | 'status'>) => {
    const newSubmission: StudentSubmission = {
      ...submission,
      id: `submission-${Date.now()}`,
      submittedAt: new Date(),
      status: 'pending',
    };

    setSubmissions(prev => [...prev, newSubmission]);
    toast.info(`Nouvelle soumission de ${submission.studentName}`);
  }, []);

  const pendingSubmissions = submissions.filter(s => s.status === 'pending');
  const acceptedSubmissions = submissions.filter(s => s.status === 'accepted');

  return {
    submissions,
    pendingSubmissions,
    acceptedSubmissions,
    isLoading,
    acceptSubmission,
    rejectSubmission,
    clearSubmissions,
    addSubmission,
  };
};