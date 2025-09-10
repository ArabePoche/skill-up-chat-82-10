
import React, { useState } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { useValidateExercise } from '@/hooks/useValidateExercise';
import { useValidateExerciseWithPromotion } from '@/hooks/useValidateExerciseWithPromotion';
import { useValidateGroupExercise } from '@/hooks/group-chat/useValidateGroupExercise';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface ExerciseValidationProps {
  message: {
    id: string;
    sender_id: string;
    lesson_id?: string;
    formation_id?: string;
    exercise_id?: string;
    level_id?: string; // Pour détecter le chat de groupe
    promotion_id?: string; // Pour le contexte groupe
  };
}

const ExerciseValidation: React.FC<ExerciseValidationProps> = ({ message }) => {
  // Utiliser le bon hook selon le contexte (chat privé vs groupe)
  const isGroupChat = !!message.level_id;
  const validateExerciseMutationPrivate = useValidateExercise();
  const validateExerciseMutationWithPromotion = useValidateExerciseWithPromotion();
  const validateGroupExerciseMutation = useValidateGroupExercise(
    message.formation_id || '', 
    message.level_id || ''
  );
  
  // Sélectionner le bon hook selon le contexte
  const validateExerciseMutation = isGroupChat ? validateGroupExerciseMutation : validateExerciseMutationWithPromotion;
  
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const handleValidateExercise = async (isValid: boolean) => {
    console.log('🔍 Validating exercise with message data:', { 
      messageId: message.id,
      lesson_id: message.lesson_id, 
      formation_id: message.formation_id,
      level_id: message.level_id,
      exercise_id: message.exercise_id,
      promotion_id: message.promotion_id,
      isGroupChat
    });
    
    // Pour le chat de groupe, on a besoin de level_id et exercise_id
    // Pour le chat privé, on a besoin de lesson_id et formation_id
    if (isGroupChat) {
      if (!message.level_id || !message.exercise_id) {
        console.error('Missing level_id or exercise_id for group chat', {
          level_id: message.level_id,
          exercise_id: message.exercise_id,
          message
        });
        toast.error('Informations manquantes pour valider l\'exercice de groupe');
        return;
      }
    } else {
      if (!message.lesson_id || !message.formation_id) {
        console.error('Missing lesson_id or formation_id for private chat', { 
          lesson_id: message.lesson_id, 
          formation_id: message.formation_id,
          message 
        });
        toast.error('Informations manquantes pour valider l\'exercice');
        return;
      }
    }

    if (!isValid && !rejectReason.trim()) {
      setShowRejectForm(true);
      return;
    }

    try {
      if (isGroupChat) {
        // Logique spécifique pour le chat de groupe
        console.log('🎯 Using group exercise validation:', {
          messageId: message.id,
          isValid,
          exerciseId: message.exercise_id,
          levelId: message.level_id
        });
        
        // Récupérer le lesson_id depuis l'exercise_id pour la validation
        const { data: exerciseData } = await supabase
          .from('exercises')
          .select('lesson_id')
          .eq('id', message.exercise_id)
          .single();

        if (!exerciseData?.lesson_id) {
          toast.error('Impossible de trouver la leçon associée à cet exercice');
          return;
        }
        
        await validateGroupExerciseMutation.mutateAsync({
          messageId: message.id,
          isValid,
          rejectReason: isValid ? undefined : rejectReason,
          exerciseId: message.exercise_id!,
          lessonId: exerciseData.lesson_id,
          targetLevelId: message.level_id,
          targetFormationId: undefined // Sera récupéré automatiquement
        });
      } else {
        // Logique pour le chat privé avec promotions
        await validateExerciseMutationWithPromotion.mutateAsync({
          messageId: message.id,
          userId: message.sender_id,
          lessonId: message.lesson_id,
          formationId: message.formation_id,
          isValid,
          rejectReason: isValid ? undefined : rejectReason
        });
      }

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