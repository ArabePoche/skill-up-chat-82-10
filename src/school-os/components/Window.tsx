// Composant fenêtre modale pour les applications
import React, { Suspense } from 'react';
import { X, Minus, Maximize2, Loader2 } from 'lucide-react';
import { WindowState } from '../types';
import { getAppById } from '../apps';
import { cn } from '@/lib/utils';

interface WindowProps {
  window: WindowState;
  onClose: (id: string) => void;
  onMinimize: (id: string) => void;
  onSplit: (id: string) => void;
  onFocus: (id: string) => void;
}

export const Window: React.FC<WindowProps> = ({
  window,
  onClose,
  onMinimize,
  onSplit,
  onFocus,
}) => {
  const app = getAppById(window.appId);

  if (!app || window.isMinimized) return null;

  const AppComponent = app.component;

  const positionClasses = {
    full: 'left-4 right-4 top-4 bottom-20',
    left: 'left-4 top-4 bottom-20 right-1/2 mr-2',
    right: 'right-4 top-4 bottom-20 left-1/2 ml-2',
  };

  return (
    <div
      className={cn(
        'fixed bg-background rounded-lg shadow-2xl flex flex-col overflow-hidden border',
        positionClasses[window.position]
      )}
      style={{ zIndex: window.zIndex }}
      onMouseDown={(e) => {
        // Ne focus que si le clic est sur le fond de la fenêtre, pas sur le contenu
        if (e.target === e.currentTarget) {
          onFocus(window.id);
        }
      }}
    >
      {/* Barre de titre */}
      <div
        className="h-12 px-4 flex items-center justify-between border-b"
        style={{ backgroundColor: app.color }}
      >
        <span className="text-white font-semibold">{app.name}</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onMinimize(window.id)}
            className="w-8 h-8 rounded-md hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <Minus className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={() => onSplit(window.id)}
            className="w-8 h-8 rounded-md hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <Maximize2 className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={() => onClose(window.id)}
            className="w-8 h-8 rounded-md hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Contenu */}
      <div className="flex-1 overflow-auto bg-background">
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          }
        >
          <AppComponent />
        </Suspense>
      </div>
    </div>
  );
};
