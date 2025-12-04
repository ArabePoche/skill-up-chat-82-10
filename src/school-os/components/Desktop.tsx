// Composant bureau principal du système scolaire
import React, { useState, useEffect } from 'react';
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
import { AppIcon } from './AppIcon';
import { Window } from './Window';
import { Taskbar } from './Taskbar';
import { QuickPanel } from './QuickPanel';
import { CreateFolderDialog } from './CreateFolderDialog';
import { DesktopFolderIcon } from './DesktopFolder';
import { FolderWindow } from './FolderWindow';
import { useWindowManager } from '../hooks/useWindowManager';
import { useWallpaper } from '../hooks/useWallpaper';
import { useDesktopSettings } from '../hooks/useDesktopSettings';
import { useDesktopFolders } from '../hooks/useDesktopFolders';
import { useSchoolYear } from '@/school/context/SchoolYearContext';
import { useFilteredApps } from '../hooks/useFilteredApps';
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
import { SchoolApp } from '../types';

export const Desktop: React.FC = () => {
  const { school } = useSchoolYear();
  
  // Utiliser les applications filtrées par permissions
  const { apps: permittedApps, isLoading: isLoadingApps } = useFilteredApps(school?.id);
  const [apps, setApps] = useState<SchoolApp[]>([]);
  const [quickPanelOpen, setQuickPanelOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [openFolderId, setOpenFolderId] = useState<string | null>(null);

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

  const {
    folders,
    createFolder,
    deleteFolder,
    renameFolder,
    changeFolderColor,
    addFileToFolder,
    removeFileFromFolder,
    getRootFolders,
    getFolderPath,
    updateFolderPositions,
  } = useDesktopFolders();

  // Clé localStorage pour persister l'ordre
  const storageKey = `desktop-order-${school?.id || 'default'}`;
  
  // State local pour l'ordre unifié (dossiers + apps)
  const [orderedItemIds, setOrderedItemIds] = useState<string[]>(() => {
    // Charger depuis localStorage au montage
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : [];
  });

  // Sauvegarder dans localStorage quand l'ordre change
  useEffect(() => {
    if (orderedItemIds.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(orderedItemIds));
    }
  }, [orderedItemIds, storageKey]);

  // Synchroniser l'ordre quand les dossiers ou apps changent
  useEffect(() => {
    const rootFolders = getRootFolders();
    const folderIds = rootFolders.map(f => `folder-${f.id}`);
    const appIds = apps.map(app => app.id);
    const allCurrentIds = [...folderIds, ...appIds];
    
    if (allCurrentIds.length === 0) return;
    
    setOrderedItemIds(prev => {
      // Filtrer les IDs qui n'existent plus
      const validPrev = prev.filter(id => allCurrentIds.includes(id));
      // Ajouter les nouveaux IDs à la fin
      const newIds = allCurrentIds.filter(id => !validPrev.includes(id));
      
      // Si l'ordre sauvegardé est vide, utiliser l'ordre par défaut
      if (validPrev.length === 0) {
        return allCurrentIds;
      }
      
      return [...validPrev, ...newIds];
    });
  }, [folders, apps, getRootFolders]);

  // Obtenir les éléments ordonnés
  const getOrderedItems = () => {
    const rootFolders = getRootFolders();
    return orderedItemIds.map(id => {
      if (id.startsWith('folder-')) {
        const folderId = id.replace('folder-', '');
        const folder = rootFolders.find(f => f.id === folderId);
        return folder ? { type: 'folder' as const, data: folder } : null;
      } else {
        const app = apps.find(a => a.id === id);
        return app ? { type: 'app' as const, data: app } : null;
      }
    }).filter(Boolean);
  };

  // Mettre à jour les apps quand les permissions changent
  useEffect(() => {
    if (permittedApps.length > 0) {
      setApps(permittedApps);
    }
  }, [permittedApps]);

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
      const activeId = String(active.id);
      const overId = String(over.id);
      
      setOrderedItemIds((items) => {
        const oldIndex = items.findIndex((id) => id === activeId);
        const newIndex = items.findIndex((id) => id === overId);
        
        if (oldIndex !== -1 && newIndex !== -1) {
          const newOrder = arrayMove(items, oldIndex, newIndex);
          
          // Persister les positions des dossiers (position = index global dans la liste)
          const folderUpdates = newOrder
            .map((id, globalIndex) => ({ id, globalIndex }))
            .filter(item => item.id.startsWith('folder-'))
            .map(item => ({
              id: item.id.replace('folder-', ''),
              position_x: item.globalIndex,
              position_y: 0,
            }));
          
          if (folderUpdates.length > 0) {
            updateFolderPositions(folderUpdates);
          }
          
          return newOrder;
        }
        return items;
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
    setApps(permittedApps);
    toast.success('Disposition du bureau réinitialisée');
  };

  const handleCreateFolder = () => {
    setCreateFolderOpen(true);
  };

  const handleFolderCreate = (name: string, color: string, isPublic: boolean) => {
    createFolder(name, color, isPublic);
    toast.success(`Dossier "${name}" créé (${isPublic ? 'public' : 'privé'})`);
  };

  const openFolder = folders.find(f => f.id === openFolderId);

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


      {/* Barre de recherche fixe style Google */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-4">
        <div className="bg-background/90 backdrop-blur-md border border-border/50 rounded-full shadow-lg hover:shadow-xl transition-shadow flex items-center gap-3 px-5 py-3">
          <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          <Input
            placeholder="Rechercher une application..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-base placeholder:text-muted-foreground/70 h-auto p-0"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="w-6 h-6 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
            >
              <span className="text-muted-foreground text-sm">✕</span>
            </button>
          )}
        </div>
      </div>

          {/* Grille d'icônes draggable */}
          <div className="absolute inset-0 pt-24 px-8 pb-24 overflow-auto pointer-events-none">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
            >
              <SortableContext 
                items={orderedItemIds} 
                strategy={rectSortingStrategy}
              >
                <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 pointer-events-auto">
                  {/* Éléments ordonnés (dossiers + apps mélangés) */}
                  {getOrderedItems().map((item) => {
                    if (!item) return null;
                    
                    if (item.type === 'folder') {
                      // Filtrer si recherche active
                      if (searchQuery && !item.data.name.toLowerCase().includes(searchQuery.toLowerCase())) {
                        return null;
                      }
                      return (
                        <DesktopFolderIcon
                          key={item.data.id}
                          folder={item.data}
                          onOpen={setOpenFolderId}
                          onRename={renameFolder}
                          onDelete={deleteFolder}
                          onChangeColor={changeFolderColor}
                          className={getIconSizeClass()}
                        />
                      );
                    } else {
                      // Filtrer si recherche active
                      if (searchQuery && !item.data.name.toLowerCase().includes(searchQuery.toLowerCase())) {
                        return null;
                      }
                      return (
                        <AppIcon
                          key={item.data.id}
                          app={item.data}
                          onOpen={handleAppClick}
                          className={getIconSizeClass()}
                        />
                      );
                    }
                  })}
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
              onSearch={() => setQuickPanelOpen(true)}
            />
          )}

          {/* Panneau d'accès rapide - filtré par permissions */}
          <QuickPanel
            isOpen={quickPanelOpen}
            onClose={() => setQuickPanelOpen(false)}
            onOpenApp={openWindow}
            apps={apps}
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

      {/* Dialog création de dossier */}
      <CreateFolderDialog
        open={createFolderOpen}
        onOpenChange={setCreateFolderOpen}
        onCreateFolder={handleFolderCreate}
      />

      {/* Fenêtre de dossier ouvert */}
      {openFolder && (
        <FolderWindow
          folder={openFolder}
          allFolders={folders}
          onClose={() => setOpenFolderId(null)}
          onAddFile={(file) => addFileToFolder(openFolder.id, file)}
          onRemoveFile={(fileId) => removeFileFromFolder(openFolder.id, fileId)}
          onNavigate={setOpenFolderId}
          onCreateSubfolder={(name, color, isPublic) => createFolder(name, color, isPublic, openFolder.id)}
          onDeleteFolder={deleteFolder}
          getFolderPath={getFolderPath}
        />
      )}
    </ContextMenu>
  );
};
