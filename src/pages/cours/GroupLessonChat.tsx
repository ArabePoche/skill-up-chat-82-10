/**
 * Page de chat groupe pour un niveau spécifique - Page standalone sans navbar
 * Structure identique à ChatInterface
 */
import React from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { GroupChatInterface } from '@/components/group-chat/GroupChatInterface';

const GroupLessonChat = () => {
  const { levelId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    // Retourner à la page précédente ou à la liste des cours
    if (location.state?.from) {
      navigate(location.state.from);
    } else {
      navigate('/cours');
    }
  };

  // Récupérer les données du niveau et de la formation depuis l'état de navigation
  // ou créer des données par défaut
  const level = location.state?.level || {
    id: levelId || 'unknown',
    title: `Niveau ${levelId || 'Inconnu'}`,
    description: '',
    order_index: 0,
    lessons: []
  };

  const formation = location.state?.formation || {
    id: location.state?.formationId || 'unknown',
    title: 'Formation inconnue'
  };

  return (
    <div className="min-h-screen bg-background">
      <GroupChatInterface
        level={level}
        formation={formation}
        onBack={handleBack}
      />
    </div>
  );
};

export default GroupLessonChat;