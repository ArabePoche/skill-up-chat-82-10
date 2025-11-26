// Composant barre de tâches avec apps ouvertes et épinglées
import React, { useState } from 'react';
import { Grid3x3, Calendar, ChevronDown, X, Pin, PinOff } from 'lucide-react';
import { WindowState } from '../types';
import { getAppById } from '../apps';
import { useSchoolYear } from '@/school/context/SchoolYearContext';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';

interface TaskbarProps {
  windows: WindowState[];
  pinnedApps: string[];
  onRestore: (id: string) => void;
  onClose: (id: string) => void;
  onTogglePin: (appId: string) => void;
  isAppPinned: (appId: string) => boolean;
  onOpenQuickPanel: () => void;
}

export const Taskbar: React.FC<TaskbarProps> = ({
  windows,
  pinnedApps,
  onRestore,
  onClose,
  onTogglePin,
  isAppPinned,
  onOpenQuickPanel,
}) => {
  const [yearPopoverOpen, setYearPopoverOpen] = useState(false);
  const { activeSchoolYear, schoolYears, setActiveSchoolYear } = useSchoolYear();

  // Combiner apps ouvertes et apps épinglées
  const allAppIds = [...new Set([...pinnedApps, ...windows.map(w => w.appId)])];

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-background/90 backdrop-blur-md border-t shadow-2xl px-4 py-2 flex items-center justify-center gap-3 z-[9999]">
        <div className="flex items-center gap-3 max-w-7xl w-full">
        {/* Bouton menu principal */}
        <button
          onClick={onOpenQuickPanel}
          className="w-10 h-10 rounded-xl bg-primary hover:bg-primary/90 flex items-center justify-center transition-colors"
        >
          <Grid3x3 className="w-5 h-5 text-primary-foreground" />
        </button>

        {/* Séparateur */}
        {allAppIds.length > 0 && (
          <div className="w-px h-8 bg-border" />
        )}

        {/* Apps ouvertes et épinglées */}
        {allAppIds.map((appId) => {
          const app = getAppById(appId);
          if (!app) return null;

          const Icon = app.icon;
          const window = windows.find(w => w.appId === appId);
          const isPinned = isAppPinned(appId);
          const isOpen = !!window;

          return (
            <ContextMenu key={appId}>
              <ContextMenuTrigger asChild>
                <button
                  onClick={() => {
                    if (window) {
                      onRestore(window.id);
                    } else {
                      // Si l'app est épinglée mais pas ouverte, on pourrait l'ouvrir ici
                      // Pour l'instant on ne fait rien
                    }
                  }}
                  className="w-10 h-10 rounded-xl hover:bg-accent transition-colors flex items-center justify-center relative"
                  style={{
                    backgroundColor: window && !window.isMinimized ? 'hsl(var(--accent))' : 'transparent',
                  }}
                  title={app.name}
                >
                  <Icon size={20} color={app.color} />
                  {window && !window.isMinimized && (
                    <div
                      className="absolute bottom-1 w-1 h-1 rounded-full"
                      style={{ backgroundColor: app.color }}
                    />
                  )}
                  {isPinned && !isOpen && (
                    <div
                      className="absolute bottom-1 w-1 h-1 rounded-full bg-muted-foreground"
                    />
                  )}
                </button>
              </ContextMenuTrigger>
              
              <ContextMenuContent>
                <ContextMenuItem onClick={() => onTogglePin(appId)}>
                  {isPinned ? (
                    <>
                      <PinOff className="w-4 h-4 mr-2" />
                      Désépingler
                    </>
                  ) : (
                    <>
                      <Pin className="w-4 h-4 mr-2" />
                      Épingler
                    </>
                  )}
                </ContextMenuItem>
                
                {window && (
                  <>
                    <ContextMenuSeparator />
                    <ContextMenuItem 
                      onClick={() => onClose(window.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Fermer
                    </ContextMenuItem>
                  </>
                )}
              </ContextMenuContent>
            </ContextMenu>
          );
        })}

        {/* Sélecteur d'année scolaire */}
        <Popover open={yearPopoverOpen} onOpenChange={setYearPopoverOpen}>
          <PopoverTrigger asChild>
            <button className="h-10 px-3 rounded-xl hover:bg-accent transition-colors flex items-center gap-2 ml-auto">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {activeSchoolYear?.year_label || 'Aucune'}
              </span>
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent 
            className="w-80 p-2 bg-background/95 backdrop-blur-md border shadow-xl z-[10000]" 
            align="end"
            sideOffset={8}
          >
            <div className="space-y-1">
              {schoolYears.map((year) => (
                <button
                  key={year.id}
                  onClick={() => {
                    setActiveSchoolYear(year);
                    setYearPopoverOpen(false);
                  }}
                  className={`w-full p-3 rounded-lg text-left transition-colors ${
                    activeSchoolYear?.id === year.id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent'
                  }`}
                >
                  <div className="font-semibold">{year.year_label}</div>
                  <div className="text-xs opacity-80 mt-1">
                    {new Date(year.start_date).toLocaleDateString()} - {new Date(year.end_date).toLocaleDateString()}
                  </div>
                </button>
              ))}
              {schoolYears.length === 0 && (
                <div className="text-center text-muted-foreground py-4 text-sm">
                  Aucune année scolaire disponible
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
        </div>
      </div>
    </>
  );
};
