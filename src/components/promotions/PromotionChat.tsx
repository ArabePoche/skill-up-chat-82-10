import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Phone, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { usePromotionMessages } from '@/hooks/useStudentProgression';
import { useSendPromotionMessage } from '@/hooks/useSendPromotionMessage';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useAuth } from '@/hooks/useAuth';
import ExerciseDisplay from '@/components/chat/ExerciseDisplay';
import { MessageReactions } from '@/components/chat/MessageReactions';
import { toast } from 'sonner';

interface PromotionChatProps {
  lessonId: string;
  formationId: string;
  lessonTitle: string;
}

export const PromotionChat: React.FC<PromotionChatProps> = ({
  lessonId,
  formationId,
  lessonTitle
}) => {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { data: messages = [], isLoading } = usePromotionMessages(lessonId, formationId);
  const sendMessage = useSendPromotionMessage(formationId);
  const { uploadFile, isUploading } = useFileUpload();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!message.trim() && !selectedExercise) return;

    try {
      await sendMessage.mutateAsync({
        lessonId,
        content: message.trim(),
        isExerciseSubmission: !!selectedExercise,
        exerciseId: selectedExercise || undefined,
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

    try {
      const { fileUrl, fileName, fileType } = await uploadFile(file);
      
      await sendMessage.mutateAsync({
        lessonId,
        content: fileName || 'Fichier envoyé',
        messageType: 'file',
        fileUrl,
        fileType,
        fileName,
        isExerciseSubmission: !!selectedExercise,
        exerciseId: selectedExercise || undefined,
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
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button size="sm" variant="ghost">
            <Phone className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost">
            <Video className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => {
          const isOwnMessage = msg.sender_id === user?.id;
          const isSystemMessage = msg.is_system_message;
          const senderName = msg.sender_profile 
            ? `${msg.sender_profile.first_name || ''} ${msg.sender_profile.last_name || ''}`.trim()
            : 'Utilisateur';

          return (
            <div key={msg.id} className="space-y-2">
              <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex items-start space-x-2 max-w-[70%] ${isOwnMessage ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  {!isOwnMessage && !isSystemMessage && (
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage src={msg.sender_profile?.avatar_url} />
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
                          isTeacherView={isSystemMessage}
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
                        <div className={`mt-2 text-xs px-2 py-1 rounded ${
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
            disabled={isUploading}
          />
          
          <Button
            size="sm"
            variant="ghost"
            onClick={() => document.getElementById('file-upload')?.click()}
            disabled={isUploading}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tapez votre message..."
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            disabled={sendMessage.isPending}
            className="flex-1"
          />
          
          <Button
            onClick={handleSendMessage}
            disabled={(!message.trim() && !selectedExercise) || sendMessage.isPending}
            size="sm"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
