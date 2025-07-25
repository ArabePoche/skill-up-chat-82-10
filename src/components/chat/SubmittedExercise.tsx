
import React from 'react';

interface SubmittedExerciseProps {
  exerciseTitle: string;
}

const SubmittedExercise: React.FC<SubmittedExerciseProps> = ({ exerciseTitle }) => {
  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
      <div className="flex items-center space-x-2 mb-2">
        <div className="w-8 h-8 bg-green-500 rounded-full text-white text-sm flex items-center justify-center">
          ✓
        </div>
        <span className="text-sm font-medium text-green-700">Exercice soumis</span>
      </div>
      <p className="text-sm text-green-600">
        Votre soumission pour "{exerciseTitle}" a été envoyée et est en attente de validation.
        La prochaine leçon sera automatiquement déverrouillée une fois validé.
      </p>
    </div>
  );
};

export default SubmittedExercise;
