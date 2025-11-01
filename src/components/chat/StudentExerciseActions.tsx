/**
 * Composant d'actions pour les soumissions d'exercices des élèves
 * Permet de modifier une soumission en attente ou rejetée
 */
import React, { useState } from 'react';
import { Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUpdateExerciseSubmission } from './hooks/useUpdateExerciseSubmission';
import SubmissionForm from './SubmissionForm';

interface StudentExerciseActionsProps {
  message: {
    id: string;
    content: string;
    exercise_status?: string;
    exercise_id?: string;
  };
  exerciseTitle?: string;
}

const StudentExerciseActions: React.FC<StudentExerciseActionsProps> = ({ 
  message,
  exerciseTitle 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const updateSubmissionMutation = useUpdateExerciseSubmission();

  // Afficher le bouton uniquement si la soumission est en attente ou rejetée
  const canEdit = message.exercise_status === 'pending' || message.exercise_status === 'rejected';

  if (!canEdit) {
    return null;
  }

  const handleSubmit = async (submissionText: string, selectedFile?: File) => {
    if (!submissionText.trim() && !selectedFile) return;

    try {
      await updateSubmissionMutation.mutateAsync({
        messageId: message.id,
        content: submissionText || `Soumission de l'exercice: ${exerciseTitle || ''}`,
        file: selectedFile,
      });

      setIsEditing(false);
    } catch (error) {
      console.error('Error updating exercise submission:', error);
    }
  };

  if (isEditing) {
    return (
      <div className="mt-3 pt-3 border-t border-gray-200">
        <div className="mb-2 text-xs text-gray-600">
          Votre nouvelle soumission remplacera l'ancienne
        </div>
        <SubmissionForm
          onSubmit={handleSubmit}
          onCancel={() => setIsEditing(false)}
          isSubmitting={updateSubmissionMutation.isPending}
          exerciseTitle={exerciseTitle || ''}
          showSubmissionOptions={true}
        />
      </div>
    );
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-200">
      <Button
        onClick={() => setIsEditing(true)}
        variant="outline"
        size="sm"
        className="w-full text-xs"
      >
        <Edit2 className="h-3 w-3 mr-1" />
        {message.exercise_status === 'rejected' 
          ? 'Modifier et re-soumettre' 
          : 'Modifier ma soumission'
        }
      </Button>
    </div>
  );
};

export default StudentExerciseActions;
