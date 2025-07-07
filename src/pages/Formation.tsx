import React from 'react';
import { useParams } from 'react-router-dom';
import FormationDetail from './FormationDetail';

const Formation = () => {
  const { formationId } = useParams();
  
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

  return <FormationDetail />;
};

export default Formation;