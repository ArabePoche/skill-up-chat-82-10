import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Phone, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { usePromotionMessages } from '@/hooks/lesson-messages/usePromotionMessages';
import { useSendPromotionMessage } from '@/hooks/group-chat/useSendPromotionMessage';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useAuth } from '@/hooks/useAuth';
import { useAccessControl } from '@/hooks/useAccessControl';
import ExerciseDisplay from '@/components/chat/ExerciseDisplay';
import { MessageReactions } from '@/components/chat/MessageReactions';
import { ValidatedByTeacherBadge } from '@/components/chat/ValidatedByTeacherBadge';
import DateSeparator from '@/components/chat/DateSeparator';
import { groupMessagesByDate } from '@/utils/dateUtils';
import { toast } from 'sonner';
import { PlanLimitAlert } from '@/plan-limits/components/PlanLimitAlert';

interface PromotionChatProps {
  lessonId: string;
  formationId: string;
  lessonTitle: string;
  promotionId: string;
}

export const PromotionChat: React.FC<PromotionChatProps> = ({
  lessonId,
  formationId,
  lessonTitle,
  promotionId
}) => {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Contrôle d'accès centralisé
  const { 
    canSend, 
    canSubmitExercise, 
    message: accessMessage, 
    actionText,
    variant,
    daysRemaining,
    isOutOfDays 
  } = useAccessControl(formationId);
  
  const { data: messages = [], isLoading } = usePromotionMessages(lessonId, formationId, promotionId);
  const sendMessage = useSendPromotionMessage(formationId);
  const { uploadFile, isUploading } = useFileUpload();

  // Fonction utilitaire pour obtenir le statut d'un exercice pour l'utilisateur actuel
  const getExerciseStatus = (exerciseId: string): string | undefined => {
    if (!user?.id) return undefined;
    
    // Trouver toutes les soumissions de cet exercice par l'utilisateur
    const submissions = messages.filter((msg: any) => 
      msg.exercise_id === exerciseId && 
      msg.sender_id === user.id &&
      msg.is_exercise_submission === true
    );

    // Trier par date décroissante pour avoir la plus récente
    const sortedSubmissions = submissions.sort((a: any, b: any) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Retourner le statut de la soumission la plus récente
    return sortedSubmissions.length > 0 ? sortedSubmissions[0].exercise_status : undefined;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!message.trim() && !selectedExercise) return;

    // Vérification d'accès déjà faite par le hook useAccessControl
    if (!canSend) {
      console.log('Envoi bloqué par le contrôle d\'accès');
      return;
    }

    try {
      await sendMessage.mutateAsync({
        lessonId,
        content: message.trim(),
        isExerciseSubmission: false, // Les fichiers normaux ne sont plus des soumissions d'exercice
        exerciseId: selectedExercise || undefined,
        promotionId,
      });

      setMessage('');
      setSelectedExercise(null);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erreur lors de l\'envoi du message');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Vérification d'accès déjà faite par le hook useAccessControl
    if (!canSend) {
      console.log('Upload bloqué par le contrôle d\'accès');
      return;
    }

    try {
      const { fileUrl, fileName, fileType } = await uploadFile(file);
      
      await sendMessage.mutateAsync({
        lessonId,
        content: fileName || 'Fichier envoyé',
        messageType: 'file',
        fileUrl,
        fileType,
        fileName,
        isExerciseSubmission: false, // Les fichiers normaux ne sont plus des soumissions d'exercice
        exerciseId: undefined,
        promotionId,
      });

      setSelectedExercise(null);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Erreur lors de l\'upload du fichier');
    }
  };

  const formatMessageTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">Chargement du chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="bg-background border-b p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary/10 text-primary">
              {lessonTitle.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-foreground">{lessonTitle}</h3>
            <p className="text-sm text-muted-foreground">
              Chat de promotion • {messages.length} messages
              {daysRemaining !== null && (
                <span className={`ml-2 ${daysRemaining <= 3 ? 'text-orange-600' : ''}`}>
                  • {daysRemaining} jour(s) restant(s)
                </span>
              )}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button 
            size="sm" 
            variant="ghost"
            disabled={!canSend}
          >
            <Phone className="h-4 w-4" />
          </Button>
          <Button 
            size="sm" 
            variant="ghost"
            disabled={!canSend}
          >
            <Video className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Alerte de restriction si nécessaire */}
      {!canSend && accessMessage && (
        <div className="p-4 border-b">
          <PlanLimitAlert
            message={accessMessage}
            variant={variant}
          />
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {Object.entries(groupMessagesByDate(messages)).map(([date, dateMessages]) => (
          <div key={date}>
            <DateSeparator date={date} />
            {dateMessages.map((msg, index) => {
          const isOwnMessage = msg.sender_id === user?.id;
          const isSystemMessage = msg.is_system_message;
          const senderName = msg.profiles 
            ? `${msg.profiles.first_name || ''} ${msg.profiles.last_name || ''}`.trim()
            : 'Utilisateur';

          return (
            <div key={msg.id} className="space-y-2">
              <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex items-start space-x-2 max-w-[70%] ${isOwnMessage ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  {!isOwnMessage && !isSystemMessage && (
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage src={msg.profiles?.avatar_url} />
                      <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                        {senderName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div className="space-y-1">
                    {!isOwnMessage && !isSystemMessage && (
                      <p className="text-xs text-muted-foreground font-medium">{senderName}</p>
                    )}
                    
                    <div className={`rounded-lg p-3 ${
                      isSystemMessage 
                        ? 'bg-blue-50 border border-blue-200 text-blue-900'
                        : isOwnMessage 
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                    }`}>
                      {msg.exercise_id && (
                        <ExerciseDisplay 
                          exercise={{
                            id: msg.exercise_id,
                            title: msg.content,
                            description: '',
                            content: ''
                          }}
                          lessonId={lessonId}
                          formationId={formationId}
                          exerciseStatus={getExerciseStatus(msg.exercise_id)}
                          isTeacherView={isSystemMessage}
                          canSubmitExercise={canSubmitExercise}
                        />
                      )}
                      
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      
                      {msg.file_url && (
                        <div className="mt-2 p-2 bg-background/10 rounded border">
                          <a 
                            href={msg.file_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs underline"
                          >
                            📎 {msg.file_name || 'Fichier joint'}
                          </a>
                        </div>
                      )}
                      
                      {msg.is_exercise_submission && (
                        <div className="mt-2 space-y-1.5">
                          <div className={`text-xs px-2 py-1 rounded ${
                            msg.exercise_status === 'approved' 
                              ? 'bg-green-100 text-green-800'
                              : msg.exercise_status === 'rejected'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {msg.exercise_status === 'approved' 
                              ? '✅ Exercice validé'
                              : msg.exercise_status === 'rejected'
                                ? '❌ Exercice rejeté'
                                : '⏳ En attente de validation'
                            }
                          </div>
                          {/* Afficher le badge du professeur qui a validé/rejeté */}
                          {msg.validated_by_teacher_id && msg.exercise_status && (
                            <ValidatedByTeacherBadge 
                              teacherId={msg.validated_by_teacher_id}
                              status={msg.exercise_status as 'approved' | 'rejected'}
                            />
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {formatMessageTime(msg.created_at)}
                      </span>
                      <MessageReactions messageId={msg.id} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-4">
        {selectedExercise && (
          <div className="mb-2 p-2 bg-blue-50 rounded border border-blue-200">
            <p className="text-sm text-blue-800">
              📝 Soumission d'exercice sélectionnée
            </p>
          </div>
        )}
        
        <div className="flex items-center space-x-2">
          <input
            type="file"
            id="file-upload"
            className="hidden"
            onChange={handleFileUpload}
            disabled={isUploading || !canSend}
          />
          
          <Button
            size="sm"
            variant="ghost"
            onClick={() => document.getElementById('file-upload')?.click()}
            disabled={isUploading || !canSend}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={canSend ? "Tapez votre message..." : "Envoi désactivé"}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            disabled={sendMessage.isPending || !canSend}
            className="flex-1"
          />
          
          <Button
            onClick={handleSendMessage}
            disabled={(!message.trim() && !selectedExercise) || sendMessage.isPending || !canSend}
            size="sm"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};