
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useSubmitExercise } from '@/hooks/useSubmitExercise';
import { useAccessControl } from '@/hooks/useAccessControl';
import ExerciseCard from './ExerciseCard';
import SubmissionForm from './SubmissionForm';
import SubmittedExercise from './SubmittedExercise';

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
  exerciseStatus?: string; // Nouveau prop pour le statut (approved, rejected, pending)
  onSubmissionComplete?: () => void;
  showSubmissionOptions?: boolean;
  canSubmitExercise?: boolean; // Nouveau prop pour contrôler l'accès
}

const ExerciseSubmission: React.FC<ExerciseSubmissionProps> = ({ 
  exercise, 
  lessonId, 
  formationId, 
  isSubmitted = false,
  exerciseStatus,
  onSubmissionComplete,
  showSubmissionOptions = true,
  canSubmitExercise
}) => {
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);
  const submitExerciseMutation = useSubmitExercise();
  
  // Utiliser le contrôle d'accès si canSubmitExercise n'est pas fourni
  const { canSubmitExercise: globalCanSubmit } = useAccessControl(formationId);
  const canSubmit = canSubmitExercise !== undefined ? canSubmitExercise : globalCanSubmit;

  const handleSubmit = async (submissionText: string, selectedFile?: File) => {
    if (!submissionText.trim() && !selectedFile) return;

    try {
      await submitExerciseMutation.mutateAsync({
        lessonId,
        formationId,
        exerciseId: exercise.id,
        content: submissionText || `Soumission de l'exercice: ${exercise.title}`,
        file: selectedFile,
      });

      setShowSubmissionForm(false);
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
    <ExerciseCard 
      exercise={exercise}
    >
      {!showSubmissionForm && showSubmissionOptions && (
        <Button
          onClick={() => setShowSubmissionForm(true)}
          size="sm"
          className="bg-blue-500 hover:bg-blue-600"
          disabled={!canSubmit}
        >
          {canSubmit ? 'Rendre l\'exercice' : 'Soumission indisponible'}
        </Button>
      )}

      {showSubmissionForm && (
        <SubmissionForm
          onSubmit={handleSubmit}
          onCancel={() => setShowSubmissionForm(false)}
          isSubmitting={submitExerciseMutation.isPending}
          exerciseTitle={exercise.title}
          showSubmissionOptions={showSubmissionOptions}
        />
      )}
    </ExerciseCard>
  );
};

export default ExerciseSubmission;