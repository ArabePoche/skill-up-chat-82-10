
import React, { useState } from 'react';
import { CheckCircle, XCircle, Paperclip, BookOpen, ChevronDown, ChevronUp, File, Download, Lock, Unlock, Edit } from 'lucide-react';
import { useValidateExercise } from '@/hooks/useValidateExercise';
import { useValidateExerciseWithPromotion } from '@/hooks/useValidateExerciseWithPromotion';
import { useValidateGroupExercise } from '@/hooks/group-chat/useValidateGroupExercise';
import { useExerciseWithFiles } from '@/hooks/useExerciseWithFiles';
import { useSubmissionLock } from '@/hooks/useSubmissionLock';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import AudioRecorder from './AudioRecorder';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useAuth } from '@/hooks/useAuth';
import { downloadFile } from '@/file-manager/utils/downloadFile';

interface ExerciseValidationProps {
  message: {
    id: string;
    sender_id: string;
    lesson_id?: string;
    formation_id?: string;
    exercise_id?: string;
    level_id?: string;
    promotion_id?: string;
    exercise_status?: string;
    locked_by_teacher_id?: string | null;
    locked_at?: string | null;
    validated_by_teacher_id?: string | null;
  };
}

const ExerciseValidation: React.FC<ExerciseValidationProps> = ({ message }) => {
  const { user } = useAuth();
  const { lockSubmission, unlockSubmission, isLocking, isUnlocking } = useSubmissionLock();
  
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
  const [showExerciseDetails, setShowExerciseDetails] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectAudioFile, setRejectAudioFile] = useState<File | null>(null);
  const [rejectFiles, setRejectFiles] = useState<File[]>([]);
  const [lockedByTeacherName, setLockedByTeacherName] = useState<string | null>(null);
  const { uploadFile, isUploading } = useFileUpload();
  
  // Récupérer l'exercice avec ses fichiers
  const { data: exerciseWithFiles } = useExerciseWithFiles(message.exercise_id);

  // Déterminer si c'est ce professeur qui a verrouillé
  const isLockedByMe = message.locked_by_teacher_id === user?.id;
  const isLocked = !!message.locked_by_teacher_id;
  const isLockedByOther = isLocked && !isLockedByMe;
  
  // Déterminer si la soumission est déjà traitée
  const isProcessed = message.exercise_status === 'approved' || message.exercise_status === 'rejected';
  
  // Déterminer si c'est ce professeur qui a validé/rejeté
  const isValidatedByMe = message.validated_by_teacher_id === user?.id;
  
  // État pour permettre la modification de la décision
  const [isEditingDecision, setIsEditingDecision] = useState(false);

  // Récupérer le nom du professeur qui a verrouillé (si ce n'est pas moi)
  React.useEffect(() => {
    if (isLockedByOther && message.locked_by_teacher_id) {
      const fetchTeacherName = async () => {
        const { data } = await supabase
          .from('profiles')
          .select('first_name, last_name, username')
          .eq('id', message.locked_by_teacher_id!)
          .single();
        
        if (data) {
          const name = `${data.first_name || ''} ${data.last_name || ''}`.trim() || data.username || 'Un autre professeur';
          setLockedByTeacherName(name);
        }
      };
      fetchTeacherName();
    }
  }, [message.locked_by_teacher_id, isLockedByOther]);

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

      // Automatiquement déverrouiller après validation/rejet
      if (isLockedByMe) {
        unlockSubmission(message.id);
      }
      
      // Réinitialiser l'état d'édition
      setIsEditingDecision(false);
    } catch (error) {
      console.error('Error validating exercise:', error);
    }
  };

  const handleLockSubmission = () => {
    lockSubmission(message.id);
  };

  const handleUnlockForEdit = () => {
    unlockSubmission(message.id);
  };

  const handleFileDownload = (fileUrl: string, fileName?: string) => {
    downloadFile(fileUrl, fileName || 'fichier');
  };

  const handleResetDecision = async () => {
    try {
      // Réinitialiser le statut et permettre une nouvelle validation
      const { error } = await supabase
        .from('lesson_messages')
        .update({ 
          exercise_status: null,
          validated_by_teacher_id: null,
          reject_audio_url: null,
          reject_audio_duration: null,
          reject_files_urls: null
        })
        .eq('id', message.id);

      if (error) throw error;

      // Verrouiller la soumission pour le prof qui modifie
      await lockSubmission(message.id);
      
      setIsEditingDecision(true);
      toast.success('Vous pouvez maintenant modifier votre décision');
    } catch (error) {
      console.error('Error resetting decision:', error);
      toast.error('Erreur lors de la réinitialisation de la décision');
    }
  };

  return (
    <div className="space-y-2 mt-2">
      {/* Bouton pour voir l'exercice */}
      {message.exercise_id && (
        <Button
          onClick={() => setShowExerciseDetails(!showExerciseDetails)}
          variant="outline"
          size="sm"
          className="w-full"
        >
          <BookOpen size={14} className="mr-2" />
          {showExerciseDetails ? 'Masquer l\'exercice' : 'Voir l\'exercice'}
          {showExerciseDetails ? <ChevronUp size={14} className="ml-2" /> : <ChevronDown size={14} className="ml-2" />}
        </Button>
      )}
      
      {/* Détails de l'exercice */}
      {showExerciseDetails && exerciseWithFiles && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-500 rounded-full text-white text-sm flex items-center justify-center">
              <BookOpen size={16} />
            </div>
            <h4 className="font-semibold text-gray-800">{exerciseWithFiles.title}</h4>
          </div>
          
          {exerciseWithFiles.description && (
            <p className="text-sm text-gray-600">{exerciseWithFiles.description}</p>
          )}
          
          {exerciseWithFiles.content && (
            <div className="bg-white p-3 rounded border">
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{exerciseWithFiles.content}</p>
            </div>
          )}
          
          {exerciseWithFiles.files && exerciseWithFiles.files.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-sm font-medium text-gray-700">Fichiers joints :</h5>
              {exerciseWithFiles.files.map((file, index) => {
                const fileName = file.file_url.split('/').pop() || 'Fichier';
                const fileType = file.file_type?.toLowerCase() || '';
                const fileUrl = file.file_url || '';
                
                // Détection améliorée des types de fichiers
                const isImage = fileType.includes('image') || /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(fileUrl);
                const isVideo = fileType.includes('video') || /\.(mp4|webm|ogg|mov|avi|mkv)$/i.test(fileUrl);
                const isAudio = fileType.includes('audio') || /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(fileUrl);
                const isPdf = fileType.includes('pdf') || /\.pdf$/i.test(fileUrl);

                return (
                  <div key={file.id || index} className="bg-white rounded border overflow-hidden">
                    {/* Prévisualisation Image */}
                    {isImage && (
                      <div className="relative">
                        <img 
                          src={file.file_url} 
                          alt={fileName}
                          className="w-full h-auto max-h-96 object-contain bg-gray-50"
                          loading="lazy"
                        />
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleFileDownload(file.file_url, fileName)}
                          className="absolute top-2 right-2"
                        >
                          <Download size={14} />
                        </Button>
                      </div>
                    )}
                    
                    {/* Prévisualisation Vidéo */}
                    {isVideo && (
                      <div className="p-2">
                        <video 
                          controls 
                          className="w-full h-auto max-h-96 rounded"
                          preload="metadata"
                        >
                          <source src={file.file_url} type={file.file_type || 'video/mp4'} />
                          Votre navigateur ne supporte pas la lecture de vidéos.
                        </video>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-600">{fileName}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleFileDownload(file.file_url, fileName)}
                          >
                            <Download size={14} className="mr-1" />
                            Télécharger
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {/* Prévisualisation Audio */}
                    {isAudio && (
                      <div className="p-3">
                        <audio 
                          controls 
                          className="w-full"
                          preload="metadata"
                        >
                          <source src={file.file_url} type={file.file_type || 'audio/mpeg'} />
                          Votre navigateur ne supporte pas la lecture audio.
                        </audio>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-600">{fileName}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleFileDownload(file.file_url, fileName)}
                          >
                            <Download size={14} className="mr-1" />
                            Télécharger
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {/* Prévisualisation PDF */}
                    {isPdf && (
                      <div className="p-2">
                        <iframe
                          src={file.file_url}
                          className="w-full h-96 border-0 rounded"
                          title={fileName}
                        />
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-600">{fileName}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleFileDownload(file.file_url, fileName)}
                          >
                            <Download size={14} className="mr-1" />
                            Télécharger
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {/* Fichier générique */}
                    {!isImage && !isVideo && !isAudio && !isPdf && (
                      <div className="flex items-center space-x-2 p-2">
                        <File size={14} className="text-gray-500" />
                        <a 
                          href={file.file_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline flex-1 truncate"
                        >
                          {fileName}
                        </a>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleFileDownload(file.file_url, fileName)}
                          className="p-1 h-6 w-6"
                        >
                          <Download size={12} />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      
      {/* Si la soumission est déjà traitée, afficher un bouton "Modifier la décision" */}
      {isProcessed && isValidatedByMe && !isEditingDecision ? (
        <Button
          onClick={handleResetDecision}
          disabled={isLocking}
          size="sm"
          variant="outline"
          className="w-full"
        >
          <Edit size={14} className="mr-2" />
          {isLocking ? 'Chargement...' : '✏️ Modifier ta décision'}
        </Button>
      ) : isLockedByOther ? (
        /* Si verrouillée par un autre professeur */
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-center space-x-2 text-yellow-800">
            <Lock size={16} />
            <span className="text-sm font-medium">
              En cours de traitement par {lockedByTeacherName || 'un autre professeur'}
            </span>
          </div>
        </div>
      ) : !isLocked && !isProcessed ? (
        /* Bouton de déverrouillage */
        <Button
          onClick={handleLockSubmission}
          disabled={isLocking}
          size="sm"
          variant="outline"
          className="w-full"
        >
          <Unlock size={14} className="mr-2" />
          {isLocking ? 'Déverrouillage...' : '🔒 Déverrouiller pour corriger'}
        </Button>
      ) : (isLockedByMe && !isProcessed && !showRejectForm) || (isEditingDecision && !showRejectForm) ? (
        /* Boutons Valider/Rejeter si verrouillé par moi et pas encore traité OU en mode édition */
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
      ) : null}

      {/* Formulaire de rejet */}
      {showRejectForm && (isLockedByMe || isEditingDecision) && (
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