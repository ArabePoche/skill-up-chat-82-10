/**
 * Chat de groupe pour les professeurs - Vue niveau avec tous les étudiants
 */
import React, { useRef, useEffect, useState } from 'react';
import MessageItem from '../chat/MessageItem';
import TypingIndicator from '../chat/TypingIndicator';
import ChatInputBar from '../chat/ChatInputBar';
import TeacherChatHeader from '../teacher/TeacherChatHeader';
import TeachingStudio from '../live-classroom/TeachingStudio';
import { ArrowLeft, Users, User } from 'lucide-react';
import { useTeacherGroupMessages } from '@/hooks/teacher-discussions/useTeacherGroupMessages';
import { useSendGroupMessage } from '@/hooks/useSendGroupMessage';
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages';
import { useTypingListener } from '@/hooks/useTypingListener';
import { useAuth } from '@/hooks/useAuth';

interface Level {
  id: string;
  title: string;
  order_index: number;
}

interface Formation {
  id: string;
  title: string;
}

interface TeacherGroupChatProps {
  level: Level;
  formation: Formation;
  onBack: () => void;
}

const TeacherGroupChat: React.FC<TeacherGroupChatProps> = ({
  level,
  formation,
  onBack
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const [showStudio, setShowStudio] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{
    id: string;
    content: string;
    sender_name: string;
  } | null>(null);

  // Hooks pour la gestion des messages de groupe
  const { data: messages = [], isLoading } = useTeacherGroupMessages(
    formation.id,
    level.id
  );

  const { isSubscribed } = useRealtimeMessages('', formation.id); // Pas de leçon spécifique pour les groupes
  const typingUsers = useTypingListener('', formation.id);

  const sendMessageMutation = useSendGroupMessage();

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (content: string, messageType = 'text', fileData?: any, repliedToMessageId?: string) => {
    sendMessageMutation.mutate({
      formationId: formation.id,
      levelId: level.id,
      content,
      messageType,
      fileUrl: fileData?.uploadUrl || fileData?.fileUrl,
      fileType: fileData?.type || fileData?.fileType,
      fileName: fileData?.name || fileData?.fileName,
      repliedToMessageId
    });
  };

  const handleReplyToMessage = (message: any) => {
    const senderName = message.profiles?.first_name || message.profiles?.username || 'Utilisateur';
    setReplyingTo({
      id: message.id,
      content: message.content,
      sender_name: senderName
    });
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  const handleScrollToMessage = (messageId: string) => {
    const messageElement = document.getElementById(`message-${messageId}`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#e5ddd5] flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-semibold mb-2">Chargement...</div>
          <p className="text-gray-600">Récupération des messages du groupe</p>
        </div>
      </div>
    );
  }

  // Afficher le studio si demandé
  if (showStudio) {
    return (
      <TeachingStudio
        formationId={formation.id}
        lessonId="" // Pas de leçon spécifique pour les groupes
        lesson={{ id: "", title: level.title }}
        onClose={() => setShowStudio(false)}
      />
    );
  }

  // Créer un objet student fictif pour TeacherChatHeader (pour compatibilité)
  const groupStudent = {
    id: level.id,
    user_id: level.id,
    profiles: {
      id: level.id,
      first_name: level.title,
      last_name: "Groupe",
      username: level.title,
      avatar_url: null
    }
  };

  const groupLesson = {
    id: level.id,
    title: `Discussion de groupe - ${level.title}`
  };

  return (
    <div className="min-h-screen bg-[#e5ddd5] flex flex-col">
      <TeacherChatHeader
        formation={formation}
        student={groupStudent}
        lesson={groupLesson}
        isSubscribed={isSubscribed}
        typingUsersCount={typingUsers.length}
        onBack={onBack}
        onOpenStudio={() => setShowStudio(true)}
      />

      {/* Zone messages */}
      <div className="flex-1 flex flex-col pb-24 md:pb-4">
        <div className="flex-1 p-4 space-y-4 custom-scrollbar overflow-y-auto">
          {/* Message système de bienvenue */}
          <div className="text-center">
            <span className="bg-[#dcf8c6] text-gray-700 px-3 py-2 rounded-lg text-sm shadow-sm">
              Discussion de groupe - {level.title}
            </span>
          </div>

          {/* Messages */}
          {messages && messages.length > 0 ? (
            messages.map((msg) => (
              <div key={msg.id} className="message-appear">
                <div id={`message-${msg.id}`}>
                  <MessageItem
                    message={msg}
                    isTeacher={true}
                    onValidateExercise={() => {}} // Pas de validation d'exercice en groupe
                    onReply={handleReplyToMessage}
                  />
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-gray-500 py-8">
              <p>Aucun message dans ce groupe pour le moment</p>
            </div>
          )}

          {/* Indicateurs de frappe */}
          {typingUsers.map(user => (
            <TypingIndicator
              key={user.user_id}
              userName={user.user_name}
              isTeacher={user.is_teacher}
            />
          ))}

          <div ref={messagesEndRef} />
        </div>

        {/* Barre d'entrée de message */}
        <div className="sticky bottom-5 md:relative md:bottom-0 bg-[#e5ddd5] z-30 pt-4">
          <ChatInputBar
            onSendMessage={handleSendMessage}
            disabled={sendMessageMutation.isPending}
            lessonId="" // Pas de leçon spécifique pour les groupes
            formationId={formation.id}
            replyingTo={replyingTo}
            onCancelReply={handleCancelReply}
            onScrollToMessage={handleScrollToMessage}
          />
        </div>
      </div>
    </div>
  );
};

export default TeacherGroupChat;
