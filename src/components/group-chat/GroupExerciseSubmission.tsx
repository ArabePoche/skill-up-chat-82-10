/**
 * Composant de soumission d'exercice spécifique au chat de groupe
 * Utilise useSubmitGroupExercise pour la logique adaptée au niveau
 */
import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { useSubmitGroupExercise } from '@/hooks/group-chat/useSubmitGroupExercise';
import { useUpdateExerciseSubmission } from '@/hooks/useUpdateExerciseSubmission';
import { useAccessControl } from '@/hooks/useAccessControl';
import { useAuth } from '@/hooks/useAuth';
import ExerciseCard from '../chat/ExerciseCard';
import SubmissionForm from '../chat/SubmissionForm';
import SubmittedExercise from '../chat/SubmittedExercise';

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
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);
  const { user } = useAuth();
  const submitExerciseMutation = useSubmitGroupExercise();
  const updateSubmissionMutation = useUpdateExerciseSubmission();
  
  // Utiliser le contrôle d'accès si canSubmitExercise n'est pas fourni
  const { canSubmitExercise: globalCanSubmit } = useAccessControl(formationId);
  const canSubmit = canSubmitExercise !== undefined ? canSubmitExercise : globalCanSubmit;

  // Trouver la soumission existante non validée
  const existingSubmission = useMemo(() => {
    if (!user?.id || !messages.length) return null;
    
    return messages.find(msg => 
      msg.exercise_id === exercise.id &&
      msg.sender_id === user.id &&
      msg.is_exercise_submission === true &&
      msg.exercise_status !== 'approved' // Peut être modifié si pas encore validé
    );
  }, [messages, exercise.id, user?.id]);

  const handleSubmit = async (submissionText: string, selectedFile?: File) => {
    if (!submissionText.trim() && !selectedFile) return;

    console.log('🎯 Using GroupExerciseSubmission for:', { 
      exerciseId: exercise.id, 
      formationId, 
      levelId,
      exerciseTitle: exercise.title,
      existingSubmission: !!existingSubmission
    });

    try {
      // Si une soumission existe déjà, la mettre à jour
      if (existingSubmission) {
        await updateSubmissionMutation.mutateAsync({
          messageId: existingSubmission.id,
          content: submissionText || `Soumission de l'exercice: ${exercise.title}`,
          file: selectedFile,
        });
      } else {
        // Sinon, créer une nouvelle soumission
        await submitExerciseMutation.mutateAsync({
          exerciseId: exercise.id,
          formationId,
          levelId,
          content: submissionText || `Soumission de l'exercice: ${exercise.title}`,
          file: selectedFile,
        });
      }

      setShowSubmissionForm(false);
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
    <ExerciseCard 
      exercise={exercise}
    >
      {!showSubmissionForm && showSubmissionOptions && (
        <Button
          onClick={() => {
            setShowSubmissionForm(true);
            // Scroll fluide vers la zone de soumission après un court délai
            setTimeout(() => {
              const element = document.querySelector('[data-submission-form="true"]');
              if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }, 100);
          }}
          size="sm"
          className="bg-blue-500 hover:bg-blue-600"
          disabled={!canSubmit}
        >
          {existingSubmission 
            ? (canSubmit ? 'Modifier la soumission' : 'Modification indisponible')
            : (canSubmit ? 'Rendre l\'exercice' : 'Soumission indisponible')
          }
        </Button>
      )}

      {showSubmissionForm && (
        <div data-submission-form="true">
          <SubmissionForm
            onSubmit={handleSubmit}
            onCancel={() => setShowSubmissionForm(false)}
            isSubmitting={submitExerciseMutation.isPending || updateSubmissionMutation.isPending}
            exerciseTitle={exercise.title}
            showSubmissionOptions={showSubmissionOptions}
            initialContent={existingSubmission?.content}
          />
        </div>
      )}
    </ExerciseCard>
  );
};

export default GroupExerciseSubmission;