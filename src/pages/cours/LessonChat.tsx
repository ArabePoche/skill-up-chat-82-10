
/**
 * Chat élève-professeur pour une leçon
 */
import React from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import ChatInterface from '@/components/ChatInterface';

const LessonChat = () => {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  if (!lessonId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Leçon non trouvée</h1>
          <p className="text-gray-600">L'ID de la leçon est manquant.</p>
        </div>
      </div>
    );
  }

  const handleBack = () => {
    // Retourner à la formation ou à la liste des cours
    const formationId = location.state?.formationId;
    if (formationId) {
      navigate(`/cours/formation/${formationId}`);
    } else {
      navigate('/cours');
    }
  };

  // Récupérer les données de la leçon depuis le state ou simuler
  const lesson = location.state?.lesson || {
    id: lessonId,
    title: `Leçon ${lessonId}`,
    description: "Description de la leçon"
  };

  const formation = location.state?.formationId ? 
    { id: location.state.formationId, title: "Formation" } : 
    { id: 'unknown', title: "Formation inconnue" };

  return (
    <ChatInterface
      lesson={lesson}
      formation={formation}
      onBack={handleBack}
    />
  );
};

export default LessonChat;
