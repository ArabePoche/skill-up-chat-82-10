
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
  isTeacherView?: boolean;
}

const SystemMessage: React.FC<SystemMessageProps> = ({
  content,
  exercise,
  lessonId,
  formationId,
  isTeacherView = false
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
          isTeacherView={isTeacherView}
          showSubmissionOptions={!isTeacherView}
        />
      )}
    </div>
  );
};

export default SystemMessage;