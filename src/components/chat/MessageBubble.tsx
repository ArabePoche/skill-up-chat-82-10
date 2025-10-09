import React, { useMemo, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import MediaPreview from './MediaPreview';
import MessageSender from './MessageSender';
import ExerciseValidation from './ExerciseValidation';
import ExerciseStatus from './ExerciseStatus';
import ReplyReference from './ReplyReference';
import FilePreviewBadge from './FilePreviewBadge';
import EmojiPicker from '@/components/EmojiPicker';
import { MoreVertical, Reply, Edit2, Trash2, Smile, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCreateStory } from '@/hooks/useStories';
import { toast } from 'sonner';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';
import { useMessageReactions, useToggleReaction } from '@/hooks/useMessageReactions';
import { useEditLessonMessage, useDeleteLessonMessage } from '@/hooks/useLessonOperations.messages';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  message_type: string;
  file_url?: string;
  file_type?: string;
  file_name?: string;
  is_exercise_submission?: boolean;
  exercise_status?: string;
  created_at: string;
  lesson_id?: string;
  formation_id?: string;
  exercise_id?: string;
  level_id?: string; // Pour détecter le chat de groupe
  replied_to_message_id?: string;
  updated_at?: string;
  replied_to_message?: {
    id: string;
    content: string;
    sender_id: string;
    profiles?: {
      first_name?: string;
      last_name?: string;
      username?: string;
    };
  };
  profiles?: {
    first_name?: string;
    last_name?: string;
    username?: string;
    is_teacher?: boolean;
  };
  is_system_message?: boolean;
}

interface MessageBubbleProps {
  message: Message;
  isTeacher: boolean;
  onReply?: (message: Message) => void; // callback pour définir la réponse dans l'input
  onScrollToMessage?: (messageId: string) => void; // Nouvelle prop pour le scroll
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isTeacher, onReply, onScrollToMessage }) => {
  const { user } = useAuth();
  const isOwnMessage = message.sender_id === user?.id;
  const isRealExerciseSubmission = message.is_exercise_submission === true;
  const isNewMessage = new Date().getTime() - new Date(message.created_at).getTime() < 5 * 60 * 1000;

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const bubbleRef = useRef<HTMLDivElement>(null);

  const { data: reactions = {} } = useMessageReactions(message.id);
  const toggleReaction = useToggleReaction();
  const editMessage = useEditLessonMessage();
  const deleteMessage = useDeleteLessonMessage();
  const createStory = useCreateStory();

  const formatTime = (date: string | Date) => {
    return new Date(date).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFileContext = () => {
    if (isRealExerciseSubmission) return 'submitted';
    if (message.content.includes('annotée')) return 'annotated';
    return 'shared';
  };

  const onSelectEmoji = async (emoji: string) => {
    setShowEmojiPicker(false);
    if (!message.id) return;
    toggleReaction.mutate({ messageId: message.id, emoji });
  };

  const aggregatedReactions = useMemo(() => {
    return Object.entries(reactions).map(([emoji, info]) => ({ emoji, ...info }));
  }, [reactions]);

  const handleReply = () => onReply?.(message);
  const handleEdit = () => {
    setIsEditing(true);
    setEditContent(message.content);
  };
  const handleDelete = () => {
    if (!window.confirm('Supprimer ce message ?')) return;
    deleteMessage.mutate({ messageId: message.id });
  };
  const handleSaveEdit = () => {
    if (!editContent.trim()) return;
    editMessage.mutate({ messageId: message.id, content: editContent }, {
      onSuccess: () => setIsEditing(false)
    });
  };

  const handlePublishToStory = async () => {
    try {
      await createStory.mutateAsync({
        content_type: 'text',
        content_text: `✅ Exercice validé !\n\n${message.content}`,
        background_color: '#22c55e' // Vert pour exercice validé
      });
      toast.success('Exercice publié en story !');
    } catch (error) {
      console.error('Error publishing to story:', error);
      toast.error('Erreur lors de la publication en story');
    }
  };

  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            ref={bubbleRef}
            className={`rounded-lg shadow-sm max-w-xs p-3 relative ${
              isOwnMessage ? 'bg-[#dcf8c6]' : 'bg-white'
            }`}
          >
            {!isOwnMessage && (
              <MessageSender profile={message.profiles} />
            )}

            {/* Référence au message répondu (persistante) */}
            {message.replied_to_message && onScrollToMessage && (
              <ReplyReference
                repliedToMessage={message.replied_to_message}
                onScrollToMessage={onScrollToMessage}
              />
            )}

            {/* File badge */}
            {message.file_url && message.file_name && (
              <div className="mb-2">
                <FilePreviewBadge
                  fileName={message.file_name}
                  fileType={message.file_type}
                  isNew={isNewMessage}
                  context={getFileContext()}
                />
              </div>
            )}

            {/* Contenu ou édition */}
            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  className="w-full text-sm border rounded p-2"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={3}
                />
                <div className="flex gap-2 justify-end">
                  <button className="text-xs px-2 py-1 rounded bg-gray-200" onClick={() => setIsEditing(false)}>Annuler</button>
                  <button className="text-xs px-2 py-1 rounded bg-[#25d366] text-white" onClick={handleSaveEdit}>Enregistrer</button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-800 mb-2 whitespace-pre-wrap">{message.content}</p>
            )}

            {message.file_url && message.file_name && (
              <div className="mt-2">
                <MediaPreview
                  fileUrl={message.file_url}
                  fileName={message.file_name}
                  fileType={message.file_type}
                  messageId={message.id}
                  isTeacher={isTeacher}
                  lessonId={message.lesson_id}
                  formationId={message.formation_id}
                />
              </div>
            )}

            {isTeacher && isRealExerciseSubmission && !message.exercise_status && (
              <ExerciseValidation message={message} />
            )}

            {isRealExerciseSubmission && message.exercise_status && (
              <div className="space-y-2">
                <ExerciseStatus status={message.exercise_status} />
                {message.exercise_status === 'approved' && isOwnMessage && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs"
                    onClick={handlePublishToStory}
                    disabled={createStory.isPending}
                  >
                    <Share2 className="h-3 w-3 mr-1" />
                    Publier en story
                  </Button>
                )}
              </div>
            )}

            {/* Heure et badge modifié */}
            <div className="text-xs text-gray-500 mt-1 flex items-center justify-end gap-2">
              {/* Badge modifié */}
              {message.updated_at && new Date(message.updated_at).getTime() > new Date(message.created_at).getTime() + 5000 && (
                <span className="bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full text-xs">
                  modifié
                </span>
              )}
              {/* Bouton actions rapide */}
              <button
                className="opacity-70 hover:opacity-100 transition"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowEmojiPicker((v) => !v);
                }}
                title="Réactions"
              >
                <Smile size={14} />
              </button>
              <span>{formatTime(message.created_at)}</span>
            </div>

            {/* Triangle */}
            <div className={`absolute ${isOwnMessage ? 'right-0' : 'left-0'} top-0 w-0 h-0 border-l-[8px] border-r-[8px] border-b-[8px] border-b-transparent transform ${
              isOwnMessage 
                ? 'border-l-[#dcf8c6] border-r-transparent translate-x-2' 
                : 'border-l-transparent border-r-white -translate-x-2'
            }`}></div>

            {/* Réactions agrégées */}
            {aggregatedReactions.length > 0 && (
              <div className={`absolute -bottom-3 ${isOwnMessage ? 'right-2' : 'left-2'} bg-white border border-gray-200 rounded-full px-2 py-0.5 text-xs shadow-sm flex gap-1`}>
                {aggregatedReactions.map(r => (
                  <span key={r.emoji} className={`flex items-center gap-0.5 ${r.reactedByMe ? 'font-semibold' : ''}`}>
                    <span>{r.emoji}</span>
                    <span>{r.count}</span>
                  </span>
                ))}
              </div>
            )}

            {/* Emoji Picker */}
            {showEmojiPicker && (
              <div className={`absolute ${isOwnMessage ? 'right-0' : 'left-0'} -top-2 translate-y-[-100%] z-50`}>
                <EmojiPicker
                  onEmojiSelect={onSelectEmoji}
                  isOpen={showEmojiPicker}
                  onToggle={() => setShowEmojiPicker(false)}
                />
              </div>
            )}
          </div>
        </ContextMenuTrigger>

        {/* Menu contextuel */}
        <ContextMenuContent>
          <ContextMenuItem onSelect={handleReply}>
            <Reply className="mr-2 h-4 w-4" /> Répondre
          </ContextMenuItem>
          <ContextMenuItem onSelect={() => setShowEmojiPicker(true)}>
            <Smile className="mr-2 h-4 w-4" /> Réactions…
          </ContextMenuItem>
          {isOwnMessage && !message.is_system_message && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem onSelect={handleEdit}>
                <Edit2 className="mr-2 h-4 w-4" /> Modifier
              </ContextMenuItem>
              <ContextMenuItem onSelect={handleDelete}>
                <Trash2 className="mr-2 h-4 w-4 text-red-600" /> Supprimer
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>
    </div>
  );
};

export default MessageBubble;