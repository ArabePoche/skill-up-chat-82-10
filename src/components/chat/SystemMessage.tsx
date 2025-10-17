
import React from 'react';
import ExerciseDisplay from './ExerciseDisplay';

interface SystemMessageProps {
  content: string;
  exercise?: {
    id: string;
    title: string;
    description?: string;
    content?: string;
  };
  lessonId: string;
  formationId: string;
  exerciseStatus?: string; // Nouveau prop pour le statut de l'exercice
  isTeacherView?: boolean;
  isGroupChat?: boolean;
  levelId?: string;
}

const SystemMessage: React.FC<SystemMessageProps> = ({
  content,
  exercise,
  lessonId,
  formationId,
  exerciseStatus,
  isTeacherView = false,
  isGroupChat = false,
  levelId
}) => {
  return (
    <div className="space-y-3">
      {/* Message système */}
      <div className="text-center">
        <span className="bg-[#dcf8c6] text-gray-700 px-3 py-2 rounded-lg text-sm shadow-sm">
          {content}
        </span>
      </div>

      {/* Exercice associé s'il y en a un */}
      {exercise && (
        <ExerciseDisplay
          exercise={exercise}
          lessonId={lessonId}
          formationId={formationId}
          exerciseStatus={exerciseStatus}
          isTeacherView={isTeacherView}
          showSubmissionOptions={!isTeacherView}
          isGroupChat={isGroupChat}
          levelId={levelId}
        />
      )}
    </div>
  );
};

export default SystemMessage;