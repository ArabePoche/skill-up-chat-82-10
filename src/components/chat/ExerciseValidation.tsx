
import React, { useState } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { useValidateExercise } from '@/hooks/useValidateExercise';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface ExerciseValidationProps {
  message: {
    id: string;
    sender_id: string;
    lesson_id?: string;
    formation_id?: string;
  };
}

const ExerciseValidation: React.FC<ExerciseValidationProps> = ({ message }) => {
  const validateExerciseMutation = useValidateExercise();
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const handleValidateExercise = async (isValid: boolean) => {
    if (!message.lesson_id || !message.formation_id) {
      console.error('Missing lesson_id or formation_id');
      toast.error('Informations manquantes pour valider l\'exercice');
      return;
    }

    if (!isValid && !rejectReason.trim()) {
      setShowRejectForm(true);
      return;
    }

    try {
      await validateExerciseMutation.mutateAsync({
        messageId: message.id,
        userId: message.sender_id,
        lessonId: message.lesson_id,
        formationId: message.formation_id,
        isValid,
        rejectReason: isValid ? undefined : rejectReason
      });

      if (!isValid) {
        setShowRejectForm(false);
        setRejectReason('');
      }
    } catch (error) {
      console.error('Error validating exercise:', error);
    }
  };

  return (
    <div className="space-y-2 mt-2">
      {!showRejectForm ? (
        <div className="flex space-x-2">
          <Button
            onClick={() => handleValidateExercise(true)}
            disabled={validateExerciseMutation.isPending}
            size="sm"
            className="bg-green-500 hover:bg-green-600 text-white"
          >
            <CheckCircle size={12} className="mr-1" />
            {validateExerciseMutation.isPending ? 'Validation...' : 'Valider'}
          </Button>
          <Button
            onClick={() => handleValidateExercise(false)}
            disabled={validateExerciseMutation.isPending}
            size="sm"
            className="bg-red-500 hover:bg-red-600 text-white"
          >
            <XCircle size={12} className="mr-1" />
            Rejeter
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <Textarea
            placeholder="Raison du rejet..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="text-xs"
            rows={2}
          />
          <div className="flex space-x-2">
            <Button
              onClick={() => handleValidateExercise(false)}
              disabled={validateExerciseMutation.isPending || !rejectReason.trim()}
              size="sm"
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {validateExerciseMutation.isPending ? 'Rejet...' : 'Confirmer rejet'}
            </Button>
            <Button
              onClick={() => {
                setShowRejectForm(false);
                setRejectReason('');
              }}
              variant="outline"
              size="sm"
            >
              Annuler
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExerciseValidation;
