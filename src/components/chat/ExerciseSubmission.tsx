
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useSubmitExercise } from '@/hooks/useSubmitExercise';
import { useAccessControl } from '@/hooks/useAccessControl';
import ExerciseCard from './ExerciseCard';
import SubmittedExercise from './SubmittedExercise';
import ExerciseSubmissionModal from '@/components/exercise-submission/ExerciseSubmissionModal';

interface ExerciseSubmissionProps {
  exercise: {
    id: string;
    title: string;
    description?: string;
    content?: string;
  };
  lessonId: string;
  formationId: string;
  isSubmitted?: boolean;
  exerciseStatus?: string;
  onSubmissionComplete?: () => void;
  showSubmissionOptions?: boolean;
  canSubmitExercise?: boolean;
  messages?: any[]; // Pour récupérer la soumission existante
}

const ExerciseSubmission: React.FC<ExerciseSubmissionProps> = ({ 
  exercise, 
  lessonId, 
  formationId, 
  isSubmitted = false,
  exerciseStatus,
  onSubmissionComplete,
  showSubmissionOptions = true,
  canSubmitExercise,
  messages = []
}) => {
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const submitExerciseMutation = useSubmitExercise();
  
  // Utiliser le contrôle d'accès si canSubmitExercise n'est pas fourni
  const { canSubmitExercise: globalCanSubmit } = useAccessControl(formationId);
  const canSubmit = canSubmitExercise !== undefined ? canSubmitExercise : globalCanSubmit;

  const handleSubmit = async (content: string, files: File[]) => {
    if (!content.trim() && files.length === 0) return;

    try {
      await submitExerciseMutation.mutateAsync({
        lessonId,
        formationId,
        exerciseId: exercise.id,
        content: content || `Soumission de l'exercice: ${exercise.title}`,
        files: files,
      });

      setShowSubmissionModal(false);
      onSubmissionComplete?.();
      
      // Scroll automatique vers le bas après soumission
      setTimeout(() => {
        if ((window as any).__scrollToBottom) {
          (window as any).__scrollToBottom();
        }
      }, 100);
    } catch (error) {
      console.error('Error submitting exercise:', error);
    }
  };

  // Si l'exercice est approuvé, ne plus afficher de bouton de soumission
  if (exerciseStatus === 'approved') {
    return null; // L'exercice est validé, pas besoin d'afficher quoi que ce soit
  }

  if (isSubmitted) {
    return <SubmittedExercise exerciseTitle={exercise.title} />;
  }

  return (
    <>
      <ExerciseCard 
        exercise={exercise}
      >
        {showSubmissionOptions && (
          <Button
            onClick={() => setShowSubmissionModal(true)}
            size="sm"
            className="bg-blue-500 hover:bg-blue-600"
            disabled={!canSubmit}
          >
            {canSubmit ? 'Rendre l\'exercice' : 'Soumission indisponible'}
          </Button>
        )}
      </ExerciseCard>

      <ExerciseSubmissionModal
        isOpen={showSubmissionModal}
        onClose={() => setShowSubmissionModal(false)}
        onSubmit={handleSubmit}
        isSubmitting={submitExerciseMutation.isPending}
        exerciseTitle={exercise.title}
      />
    </>
  );
};

export default ExerciseSubmission;