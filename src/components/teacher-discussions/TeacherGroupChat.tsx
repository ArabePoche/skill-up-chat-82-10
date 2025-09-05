/**
 * Chat de groupe pour les professeurs - Vue niveau avec tous les étudiants
 */
import React, { useRef, useEffect } from 'react';
import MessageItem from '../chat/MessageItem';
import TypingIndicator from '../chat/TypingIndicator';
import ChatInputBar from '../chat/ChatInputBar';
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

  const handleSendMessage = (content: string, messageType = 'text', fileData?: any) => {
    sendMessageMutation.mutate({
      formationId: formation.id,
      levelId: level.id,
      content,
      messageType,
      fileUrl: fileData?.fileUrl,
      fileType: fileData?.fileType,
      fileName: fileData?.fileName
    });
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

  return (
    <div className="min-h-screen bg-[#e5ddd5] flex flex-col">
      {/* Header - Style WhatsApp pour groupe */}
      <div className="bg-[#25d366] text-white sticky top-0 z-40">
        <div className="flex items-center p-4">
          <button
            onClick={onBack}
            className="mr-3 p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mr-3">
            <Users size={20} />
          </div>
          <div className="flex-1">
            <h1 className="font-semibold text-lg">{level.title}</h1>
            <p className="text-sm text-white/80">
              Discussion de groupe • {formation.title}
            </p>
          </div>
        </div>
      </div>

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
                <MessageItem
                  message={msg}
                  isTeacher={true}
                  onValidateExercise={() => {}} // Pas de validation d'exercice en groupe
                />
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
          />
        </div>
      </div>
    </div>
  );
};

export default TeacherGroupChat;