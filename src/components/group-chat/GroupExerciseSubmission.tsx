/**
 * Composant de soumission d'exercice spécifique au chat de groupe
 * Utilise useSubmitGroupExercise pour la logique adaptée au niveau
 */
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useSubmitGroupExercise } from '@/hooks/group-chat/useSubmitGroupExercise';
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
  onSubmissionComplete?: () => void;
  showSubmissionOptions?: boolean;
}

const GroupExerciseSubmission: React.FC<GroupExerciseSubmissionProps> = ({ 
  exercise, 
  formationId,
  levelId,
  isSubmitted = false,
  onSubmissionComplete,
  showSubmissionOptions = true
}) => {
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);
  const submitExerciseMutation = useSubmitGroupExercise();

  const handleSubmit = async (submissionText: string, selectedFile?: File) => {
    if (!submissionText.trim() && !selectedFile) return;

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
        content: submissionText || `Soumission de l'exercice: ${exercise.title}`,
        file: selectedFile,
      });

      setShowSubmissionForm(false);
      onSubmissionComplete?.();
    } catch (error) {
      console.error('Error submitting group exercise:', error);
    }
  };

  if (isSubmitted) {
    return <SubmittedExercise exerciseTitle={exercise.title} />;
  }

  return (
    <ExerciseCard 
      exercise={exercise}
    >
      {!showSubmissionForm && (
        <Button
          onClick={() => setShowSubmissionForm(true)}
          size="sm"
          className="bg-blue-500 hover:bg-blue-600"
        >
          Rendre l'exercice
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

export default GroupExerciseSubmission;
