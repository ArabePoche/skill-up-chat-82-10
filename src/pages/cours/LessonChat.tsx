
/**
 * Chat Ã©lÃ¨ve-professeur pour une leÃ§on
 */
import React from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { SmartChatInterface } from '@/components/chat/SmartChatInterface';

const LessonChat = () => {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  if (!lessonId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">LeÃ§on non trouvÃ©e</h1>
          <p className="text-gray-600">L'ID de la leÃ§on est manquant.</p>
        </div>
      </div>
    );
  }

  const handleBack = () => {
    // Retourner Ã  la formation ou Ã  la liste des cours
    const formationId = location.state?.formationId;
    if (formationId) {
      navigate(`/cours/formation/${formationId}`);
    } else {
      navigate('/cours');
    }
  };

  // RÃ©cupÃ©rer les donnÃ©es de la leÃ§on depuis le state ou simuler
  const lesson = location.state?.lesson || {
    id: lessonId,
    title: `LeÃ§on ${lessonId}`,
    description: "Description de la leÃ§on"
  };

  const formation = location.state?.formationId ? 
    { id: location.state.formationId, title: "Formation" } : 
    { id: 'unknown', title: "Formation inconnue" };

  return (
    <SmartChatInterface
      lesson={lesson}
      formation={formation}
      onBack={handleBack}
    />
  );
};

export default LessonChat;


