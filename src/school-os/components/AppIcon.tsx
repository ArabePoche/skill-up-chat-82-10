// Composant icône d'application draggable
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SchoolApp } from '../types';
import { useTranslatedApps } from '../hooks/useTranslatedApps';

interface AppIconProps {
  app: SchoolApp;
  onOpen: (appId: string) => void;
  className?: string;
}

export const AppIcon: React.FC<AppIconProps> = ({ app, onOpen, className = 'w-20 h-24' }) => {
  const { getAppName } = useTranslatedApps();
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: app.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const IconComponent = app.icon;
  const translatedName = getAppName(app.id);

  const handleClick = (e: React.MouseEvent) => {
    // Empêcher le clic si on est en train de drag
    if (!isDragging) {
      onOpen(app.id);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-background/10 cursor-pointer transition-colors ${className}`}
      {...attributes}
      {...listeners}
      onClick={handleClick}
    >
      <div
        className="w-14 h-14 rounded-xl flex items-center justify-center shadow-lg"
        style={{ backgroundColor: app.color }}
      >
        <IconComponent className="w-7 h-7 text-white" />
      </div>
      <span className="text-xs font-medium text-white drop-shadow-lg text-center max-w-[80px] truncate">
        {translatedName}
      </span>
    </div>
  );
};
