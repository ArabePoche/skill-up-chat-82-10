
import React, { useState, useEffect, useRef } from 'react';
import { Video, MessageCircle } from 'lucide-react';

interface VideoMessageSwitchProps {
  onScrollToVideo: () => void;
  onScrollToMessages: () => void;
  className?: string;
}

const VideoMessageSwitch: React.FC<VideoMessageSwitchProps> = ({
  onScrollToVideo,
  onScrollToMessages,
  className = ''
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState(0);
  const [showIcons, setShowIcons] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const startPosition = useRef(0);

  const handleStart = (clientY: number) => {
    setIsDragging(true);
    setShowIcons(true);
    startY.current = clientY;
    startPosition.current = dragPosition;
  };

  const handleMove = (clientY: number) => {
    if (!isDragging) return;
    
    const deltaY = clientY - startY.current;
    const newPosition = Math.max(-40, Math.min(40, startPosition.current + deltaY));
    setDragPosition(newPosition);
  };

  const handleEnd = () => {
    if (!isDragging) return;
    
    setIsDragging(false);
    
    // Déterminer l'action basée sur la position finale
    if (dragPosition < -20) {
      // Glissé vers le haut → vidéo
      onScrollToVideo();
    } else if (dragPosition > 20) {
      // Glissé vers le bas → messages
      onScrollToMessages();
    }
    
    // Reset position avec animation
    setDragPosition(0);
    
    // Masquer les icônes après un délai
    setTimeout(() => setShowIcons(false), 1000);
  };

  // Gestion des événements tactiles
  const handleTouchStart = (e: React.TouchEvent) => {
    handleStart(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    handleMove(e.touches[0].clientY);
  };

  const handleTouchEnd = () => {
    handleEnd();
  };

  // Gestion des événements souris
  const handleMouseDown = (e: React.MouseEvent) => {
    handleStart(e.clientY);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      handleMove(e.clientY);
    };

    const handleMouseUp = () => {
      handleEnd();
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragPosition]);

  const handleClick = () => {
    if (!showIcons) {
      setShowIcons(true);
      setTimeout(() => setShowIcons(false), 2000);
    }
  };

  return (
    <div className={`fixed right-4 top-1/2 transform -translate-y-1/2 z-30 flex items-center justify-center ${className}`}>
      {/* Icônes contextuelles */}
      <div className={`absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-300 ${
        showIcons ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}>
        {/* Icône vidéo en haut */}
        <button
          onClick={onScrollToVideo}
          className="absolute -top-12 bg-blue-500 text-white p-2 rounded-full shadow-lg hover:bg-blue-600 transition-colors z-10"
        >
          <Video size={16} />
        </button>
        
        {/* Icône message en bas */}
        <button
          onClick={onScrollToMessages}
          className="absolute -bottom-12 bg-green-500 text-white p-2 rounded-full shadow-lg hover:bg-green-600 transition-colors z-10"
        >
          <MessageCircle size={16} />
        </button>
      </div>

      {/* Bouton principal */}
      <div
        ref={buttonRef}
        className={`
          w-12 h-6 bg-gray-300 rounded-full cursor-pointer shadow-md
          flex items-center justify-center relative overflow-hidden
          transition-all duration-300 ease-out
          ${isDragging ? 'scale-110 shadow-lg' : 'hover:shadow-lg'}
          ${dragPosition < -10 ? 'bg-blue-400' : dragPosition > 10 ? 'bg-green-400' : 'bg-gray-300'}
        `}
        style={{
          transform: `translateY(${dragPosition}px)`,
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleClick}
      >
        {/* Indicateur de direction */}
        <div className={`
          w-4 h-1 bg-white rounded-full transition-all duration-200
          ${dragPosition < -10 ? 'transform -translate-y-1' : 
            dragPosition > 10 ? 'transform translate-y-1' : ''}
        `} />
        
        {/* Lignes de grip */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-3 flex flex-col justify-between opacity-40">
            <div className="w-full h-0.5 bg-gray-600 rounded" />
            <div className="w-full h-0.5 bg-gray-600 rounded" />
            <div className="w-full h-0.5 bg-gray-600 rounded" />
          </div>
        </div>
      </div>

      {/* Indicateurs de feedback */}
      {isDragging && (
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
          <div className={`
            px-2 py-1 rounded text-xs font-medium transition-all duration-200
            ${dragPosition < -20 ? 'bg-blue-500 text-white' : 
              dragPosition > 20 ? 'bg-green-500 text-white' : 
              'bg-gray-500 text-white'}
          `}>
            {dragPosition < -20 ? '🎥 Vidéo' : 
             dragPosition > 20 ? '💬 Messages' : 
             'Glisser'}
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoMessageSwitch;
