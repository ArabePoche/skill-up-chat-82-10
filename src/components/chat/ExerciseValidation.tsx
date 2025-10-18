
import React, { useState } from 'react';
import { CheckCircle, XCircle, Paperclip } from 'lucide-react';
import { useValidateExercise } from '@/hooks/useValidateExercise';
import { useValidateExerciseWithPromotion } from '@/hooks/useValidateExerciseWithPromotion';
import { useValidateGroupExercise } from '@/hooks/group-chat/useValidateGroupExercise';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import AudioRecorder from './AudioRecorder';
import { useFileUpload } from '@/hooks/useFileUpload';

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
  const [rejectAudioFile, setRejectAudioFile] = useState<File | null>(null);
  const [rejectFiles, setRejectFiles] = useState<File[]>([]);
  const { uploadFile, isUploading } = useFileUpload();

  const handleAudioRecording = (file: File) => {
    setRejectAudioFile(file);
    toast.success('Message vocal enregistré');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setRejectFiles(prev => [...prev, ...newFiles]);
      toast.success(`${newFiles.length} fichier(s) ajouté(s)`);
    }
  };

  const handleRemoveFile = (index: number) => {
    setRejectFiles(prev => prev.filter((_, i) => i !== index));
  };

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

    if (!isValid && !rejectReason.trim() && !rejectAudioFile && rejectFiles.length === 0) {
      setShowRejectForm(true);
      return;
    }

    try {
      let audioUrl: string | null = null;
      let audioDuration: number | null = null;
      let filesUrls: string[] = [];

      // Upload audio si présent
      if (!isValid && rejectAudioFile) {
        const audioResult = await uploadFile(rejectAudioFile, 'exercise_rejection_files');
        audioUrl = audioResult.fileUrl;
        
        // Calculer la durée audio
        const audio = new Audio();
        const audioBlob = await rejectAudioFile.arrayBuffer();
        const blob = new Blob([audioBlob], { type: rejectAudioFile.type });
        const url = URL.createObjectURL(blob);
        audio.src = url;
        
        await new Promise((resolve) => {
          audio.onloadedmetadata = () => {
            audioDuration = Math.floor(audio.duration);
            URL.revokeObjectURL(url);
            resolve(null);
          };
        });
      }

      // Upload fichiers si présents
      if (!isValid && rejectFiles.length > 0) {
        const uploadPromises = rejectFiles.map(file => 
          uploadFile(file, 'exercise_rejection_files')
        );
        const results = await Promise.all(uploadPromises);
        filesUrls = results.map(r => r.fileUrl);
      }
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
          targetFormationId: undefined, // Sera récupéré automatiquement
          rejectAudioUrl: audioUrl,
          rejectAudioDuration: audioDuration,
          rejectFilesUrls: filesUrls
        });
      } else {
        // Logique pour le chat privé avec promotions
        await validateExerciseMutationWithPromotion.mutateAsync({
          messageId: message.id,
          userId: message.sender_id,
          lessonId: message.lesson_id,
          formationId: message.formation_id,
          isValid,
          rejectReason: isValid ? undefined : rejectReason,
          rejectAudioUrl: audioUrl,
          rejectAudioDuration: audioDuration,
          rejectFilesUrls: filesUrls
        });
      }

      if (!isValid) {
        setShowRejectForm(false);
        setRejectReason('');
        setRejectAudioFile(null);
        setRejectFiles([]);
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
        <div className="space-y-3">
          <Textarea
            placeholder="Expliquez pourquoi l'exercice est rejeté (optionnel si vous ajoutez un vocal ou des fichiers)..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="text-xs"
            rows={3}
          />
          
          {/* Enregistreur audio */}
          <div className="flex flex-col space-y-2">
            <label className="text-xs font-medium text-gray-600">Message vocal (optionnel)</label>
            <AudioRecorder 
              onRecordingComplete={handleAudioRecording}
              disabled={isUploading || validateExerciseMutation.isPending}
            />
            {rejectAudioFile && (
              <span className="text-xs text-green-600">✓ Message vocal enregistré</span>
            )}
          </div>

          {/* Upload de fichiers */}
          <div className="flex flex-col space-y-2">
            <label className="text-xs font-medium text-gray-600">Fichiers d'aide (optionnel)</label>
            <div className="flex items-center space-x-2">
              <input
                type="file"
                multiple
                onChange={handleFileSelect}
                disabled={isUploading || validateExerciseMutation.isPending}
                className="hidden"
                id="reject-files-input"
                accept="image/*,video/*,.pdf,.doc,.docx"
              />
              <Button
                onClick={() => document.getElementById('reject-files-input')?.click()}
                variant="outline"
                size="sm"
                disabled={isUploading || validateExerciseMutation.isPending}
              >
                <Paperclip size={14} className="mr-1" />
                Joindre fichiers
              </Button>
              {rejectFiles.length > 0 && (
                <span className="text-xs text-gray-600">{rejectFiles.length} fichier(s)</span>
              )}
            </div>
            {rejectFiles.length > 0 && (
              <div className="space-y-1">
                {rejectFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between text-xs bg-gray-50 p-2 rounded">
                    <span className="truncate flex-1">{file.name}</span>
                    <Button
                      onClick={() => handleRemoveFile(index)}
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                    >
                      <XCircle size={14} className="text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex space-x-2">
            <Button
              onClick={() => handleValidateExercise(false)}
              disabled={
                validateExerciseMutation.isPending || 
                isUploading ||
                (!rejectReason.trim() && !rejectAudioFile && rejectFiles.length === 0)
              }
              size="sm"
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {validateExerciseMutation.isPending || isUploading ? 'Envoi...' : 'Confirmer rejet'}
            </Button>
            <Button
              onClick={() => {
                setShowRejectForm(false);
                setRejectReason('');
                setRejectAudioFile(null);
                setRejectFiles([]);
              }}
              variant="outline"
              size="sm"
              disabled={validateExerciseMutation.isPending || isUploading}
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