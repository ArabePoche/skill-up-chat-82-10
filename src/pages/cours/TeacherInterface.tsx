
/**
 * Interface professeur pour une formation
 */
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TeacherView from '@/components/TeacherView';

const TeacherInterface = () => {
  const { formationId } = useParams();
  const navigate = useNavigate();

  if (!formationId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Formation non trouvée</h1>
          <p className="text-gray-600">L'ID de la formation est manquant.</p>
        </div>
      </div>
    );
  }

  const handleBack = () => {
    navigate('/cours');
  };

  // Simuler une formation pour le moment
  const mockFormation = {
    id: formationId,
    title: "Formation Example",
    author: "Professeur"
  };

  return (
    <TeacherView
      formation={mockFormation}
      onBack={handleBack}
    />
  );
};

export default TeacherInterface;
