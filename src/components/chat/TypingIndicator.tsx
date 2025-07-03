
import React from 'react';

interface TypingIndicatorProps {
  userName: string;
  isTeacher: boolean;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ userName, isTeacher }) => {
  return (
    <div className="flex items-center space-x-2 p-2 bg-gray-100 rounded-lg mb-2">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
        isTeacher ? 'bg-blue-500' : 'bg-[#25d366]'
      }`}>
        <span className="text-white text-xs">
          {isTeacher ? '👨‍🏫' : '👨‍🎓'}
        </span>
      </div>
      <div className="flex items-center space-x-1">
        <span className="text-sm text-gray-600">
          {userName} {isTeacher ? '(Professeur)' : ''} est en train d'écrire
        </span>
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;
