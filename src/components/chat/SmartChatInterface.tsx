
/**
 * Wrapper intelligent qui choisit automatiquement entre ChatInterface et GroupChatInterface
 * selon le mode de formation détecté
 */
import React from 'react';
import { useChatMode } from '@/hooks/chat/useChatMode';
import ChatInterface from '../ChatInterface';
import { GroupChatInterface } from '../group-chat/GroupChatInterface';

interface SmartChatInterfaceProps {
  lesson?: {
    id: number | string;
    title: string;
    video_url?: string;
  };
  level?: {
    id: string | number;
    title: string;
    description?: string;
    order_index: number;
    lessons?: Array<{
      id: string | number;
      title: string;
      description?: string;
      order_index: number;
      video_url?: string;
      duration?: string;
      exercises?: { id: string }[];
    }>;
  };
  formation: {
    id: string;
    title: string;
  };
  onBack: () => void;
}

export const SmartChatInterface: React.FC<SmartChatInterfaceProps> = ({
  lesson,
  level,
  formation,
  onBack
}) => {
  const { mode, isLoading } = useChatMode(formation.id);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#e5ddd5] flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-semibold mb-2">Chargement...</div>
          <p className="text-gray-600">Détection du type de formation</p>
        </div>
      </div>
    );
  }

  // Mode groupe : utiliser GroupChatInterface
  if (mode === 'group' && level) {
    return (
      <GroupChatInterface
        level={level}
        formation={formation}
        onBack={onBack}
      />
    );
  }

  // Mode privé : utiliser ChatInterface classique
  if (mode === 'private' && lesson) {
    return (
      <ChatInterface
        lesson={lesson}
        formation={formation}
        onBack={onBack}
      />
    );
  }

  // Fallback : si aucun mode détecté ou données manquantes
  return (
    <div className="min-h-screen bg-[#e5ddd5] flex items-center justify-center">
      <div className="text-center">
        <div className="text-lg font-semibold mb-2">Erreur de configuration</div>
        <p className="text-gray-600">Impossible de déterminer le type de formation</p>
        <button 
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Retour
        </button>
      </div>
    </div>
  );
};
