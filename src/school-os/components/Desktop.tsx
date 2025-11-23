// Composant bureau principal du système scolaire
import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { Search, Image as ImageIcon, RefreshCw, Eye, EyeOff, Maximize2, FolderPlus } from 'lucide-react';
import { schoolApps } from '../apps';
import { AppIcon } from './AppIcon';
import { Window } from './Window';
import { Taskbar } from './Taskbar';
import { QuickPanel } from './QuickPanel';
import { useWindowManager } from '../hooks/useWindowManager';
import { useWallpaper } from '../hooks/useWallpaper';
import { useDesktopSettings } from '../hooks/useDesktopSettings';
import { Input } from '@/components/ui/input';
import { useFileUpload } from '@/hooks/useFileUpload';
import { toast } from 'sonner';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
} from '@/components/ui/context-menu';

export const Desktop: React.FC = () => {
  const [apps, setApps] = useState(schoolApps);
  const [quickPanelOpen, setQuickPanelOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);

  const {
    windows,
    openWindow,
    closeWindow,
    minimizeWindow,
    restoreWindow,
    splitWindow,
    focusWindow,
  } = useWindowManager();

  const { wallpaper, changeWallpaper, resetWallpaper } = useWallpaper();
  const { uploadFile, isUploading } = useFileUpload();
  
  const {
    taskbarVisible,
    toggleTaskbar,
    iconSize,
    changeIconSize,
    pinnedApps,
    togglePinApp,
    isAppPinned,
    getIconSizeClass,
  } = useDesktopSettings();

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setApps((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
    
    setActiveId(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const handleAppClick = (appId: string) => {
    openWindow(appId);
  };

  const filteredApps = searchQuery
    ? apps.filter(app => app.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : apps;

  const handleResetLayout = () => {
    setApps(schoolApps);
    toast.success('Disposition du bureau réinitialisée');
  };

  const handleCreateFolder = () => {
    toast.info('Création de dossier : fonctionnalité à venir');
  };

  const handleWallpaperUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }

    try {
      const result = await uploadFile(file, 'school_os_wallpapers');
      changeWallpaper(result.fileUrl);
      toast.success('Fond d\'écran modifié avec succès');
    } catch (error) {
      console.error('Erreur upload fond d\'écran:', error);
      toast.error('Erreur lors du changement de fond d\'écran');
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="h-screen w-full relative overflow-hidden">
          {/* Fond d'écran */}
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${wallpaper})` }}
          >
            <div className="absolute inset-0 bg-black/20" />
          </div>

      {/* Barre de recherche fixe en haut à droite */}
      <div className="absolute top-6 right-6 z-50">
        {searchOpen ? (
          <div className="bg-background/80 backdrop-blur-md border rounded-xl shadow-xl p-2 flex items-center gap-2 w-48">
            <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <Input
              autoFocus
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
              onBlur={() => {
                setTimeout(() => {
                  setSearchOpen(false);
                  setSearchQuery('');
                }, 200);
              }}
            />
          </div>
        ) : (
          <button
            onClick={() => setSearchOpen(true)}
            className="w-10 h-10 bg-background/80 backdrop-blur-md border rounded-xl shadow-xl hover:bg-background/90 transition-colors flex items-center justify-center"
          >
            <Search className="w-5 h-5" />
          </button>
        )}
      </div>

          {/* Grille d'icônes draggable */}
          <div className="absolute inset-0 p-8 pb-24 overflow-auto pointer-events-none">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
            >
              <SortableContext items={apps.map(app => app.id)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 pointer-events-auto">
                  {filteredApps.map((app) => (
                    <AppIcon
                      key={app.id}
                      app={app}
                      onOpen={handleAppClick}
                      className={getIconSizeClass()}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {filteredApps.length === 0 && searchQuery && (
              <div className="text-center text-white drop-shadow-lg mt-12 pointer-events-auto">
                Aucune application trouvée
              </div>
            )}
          </div>

          {/* Fenêtres ouvertes */}
          {windows.map((window) => (
            <Window
              key={window.id}
              window={window}
              onClose={closeWindow}
              onMinimize={minimizeWindow}
              onSplit={splitWindow}
              onFocus={focusWindow}
            />
          ))}

          {/* Barre de tâches */}
          {taskbarVisible && (
            <Taskbar
              windows={windows}
              pinnedApps={pinnedApps}
              onRestore={restoreWindow}
              onClose={closeWindow}
              onTogglePin={togglePinApp}
              isAppPinned={isAppPinned}
              onOpenQuickPanel={() => setQuickPanelOpen(true)}
              onSearch={() => setSearchOpen(true)}
            />
          )}

          {/* Panneau d'accès rapide */}
          <QuickPanel
            isOpen={quickPanelOpen}
            onClose={() => setQuickPanelOpen(false)}
            onOpenApp={openWindow}
          />

          <input
            id="wallpaper-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleWallpaperUpload}
          />
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-64">
        <ContextMenuItem
          onClick={() => document.getElementById('wallpaper-upload')?.click()}
          disabled={isUploading}
        >
          <ImageIcon className="w-4 h-4 mr-2" />
          {isUploading ? 'Upload en cours...' : 'Changer le fond d\'écran'}
        </ContextMenuItem>
        <ContextMenuItem onClick={resetWallpaper}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Réinitialiser le fond d'écran
        </ContextMenuItem>
        
        <ContextMenuSeparator />
        
        <ContextMenuItem onClick={toggleTaskbar}>
          {taskbarVisible ? (
            <>
              <EyeOff className="w-4 h-4 mr-2" />
              Masquer la barre de tâches
            </>
          ) : (
            <>
              <Eye className="w-4 h-4 mr-2" />
              Afficher la barre de tâches
            </>
          )}
        </ContextMenuItem>
        
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <Maximize2 className="w-4 h-4 mr-2" />
            Taille des icônes
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem onClick={() => changeIconSize('small')}>
              {iconSize === 'small' && '✓ '}Petite
            </ContextMenuItem>
            <ContextMenuItem onClick={() => changeIconSize('medium')}>
              {iconSize === 'medium' && '✓ '}Moyenne
            </ContextMenuItem>
            <ContextMenuItem onClick={() => changeIconSize('large')}>
              {iconSize === 'large' && '✓ '}Grande
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        
        <ContextMenuSeparator />
        
        <ContextMenuItem onClick={handleResetLayout}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Réinitialiser la disposition
        </ContextMenuItem>
        
        <ContextMenuItem onClick={handleCreateFolder}>
          <FolderPlus className="w-4 h-4 mr-2" />
          Créer un dossier
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};
