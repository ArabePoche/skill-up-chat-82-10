/**
 * Composant de soumission d'exercice spécifique au chat de groupe
 * Utilise useSubmitGroupExercise pour la logique adaptée au niveau
 */
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useSubmitGroupExercise } from '@/hooks/group-chat/useSubmitGroupExercise';
import { useAccessControl } from '@/hooks/useAccessControl';
import ExerciseCard from '../chat/ExerciseCard';
import SubmittedExercise from '../chat/SubmittedExercise';
import ExerciseSubmissionModal from '@/components/exercise-submission/ExerciseSubmissionModal';

interface GroupExerciseSubmissionProps {
  exercise: {
    id: string;
    title: string;
    description?: string;
    content?: string;
  };
  formationId: string;
  levelId: string;
  isSubmitted?: boolean;
  exerciseStatus?: string;
  onSubmissionComplete?: () => void;
  showSubmissionOptions?: boolean;
  canSubmitExercise?: boolean;
  messages?: any[]; // Pour récupérer la soumission existante
}

const GroupExerciseSubmission: React.FC<GroupExerciseSubmissionProps> = ({ 
  exercise, 
  formationId,
  levelId,
  isSubmitted = false,
  exerciseStatus,
  onSubmissionComplete,
  showSubmissionOptions = true,
  canSubmitExercise,
  messages = []
}) => {
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const submitExerciseMutation = useSubmitGroupExercise();
  
  // Utiliser le contrôle d'accès si canSubmitExercise n'est pas fourni
  const { canSubmitExercise: globalCanSubmit } = useAccessControl(formationId);
  const canSubmit = canSubmitExercise !== undefined ? canSubmitExercise : globalCanSubmit;

  const handleSubmit = async (content: string, files: File[]) => {
    if (!content.trim() && files.length === 0) return;

    console.log('🎯 Using GroupExerciseSubmission for:', { 
      exerciseId: exercise.id, 
      formationId, 
      levelId,
      exerciseTitle: exercise.title
    });

    try {
      await submitExerciseMutation.mutateAsync({
        exerciseId: exercise.id,
        formationId,
        levelId,
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
      console.error('Error submitting group exercise:', error);
    }
  };

  // L'exercice n'est masqué que si toutes les soumissions sont approuvées
  if (exerciseStatus === 'approved') {
    return null;
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

export default GroupExerciseSubmission;