
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useSubmitExercise } from '@/hooks/useSubmitExercise';
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
  onSubmissionComplete?: () => void;
  showSubmissionOptions?: boolean;
}

const ExerciseSubmission: React.FC<ExerciseSubmissionProps> = ({ 
  exercise, 
  lessonId, 
  formationId, 
  isSubmitted = false,
  onSubmissionComplete,
  showSubmissionOptions = true
}) => {
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);
  const submitExerciseMutation = useSubmitExercise();

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
    } catch (error) {
      console.error('Error submitting exercise:', error);
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

export default ExerciseSubmission;
