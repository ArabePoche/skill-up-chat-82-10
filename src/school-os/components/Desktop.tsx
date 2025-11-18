// Composant bureau principal du système scolaire
import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
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
import { Search } from 'lucide-react';
import { schoolApps } from '../apps';
import { AppIcon } from './AppIcon';
import { Window } from './Window';
import { Taskbar } from './Taskbar';
import { QuickPanel } from './QuickPanel';
import { useWindowManager } from '../hooks/useWindowManager';
import { useWallpaper } from '../hooks/useWallpaper';
import { Input } from '@/components/ui/input';

export const Desktop: React.FC = () => {
  const [apps, setApps] = useState(schoolApps);
  const [quickPanelOpen, setQuickPanelOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const {
    windows,
    openWindow,
    closeWindow,
    minimizeWindow,
    restoreWindow,
    splitWindow,
    focusWindow,
  } = useWindowManager();

  const { wallpaper, changeWallpaper } = useWallpaper();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setApps((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const filteredApps = searchQuery
    ? apps.filter(app => app.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : apps;

  return (
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
      <div className="absolute inset-0 p-8 pb-24 overflow-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={apps.map(app => app.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
              {filteredApps.map((app) => (
                <AppIcon key={app.id} app={app} onOpen={openWindow} />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {filteredApps.length === 0 && searchQuery && (
          <div className="text-center text-white drop-shadow-lg mt-12">
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
      <Taskbar
        windows={windows}
        onRestore={restoreWindow}
        onOpenQuickPanel={() => setQuickPanelOpen(true)}
        onSearch={() => setSearchOpen(true)}
        onChangeWallpaper={changeWallpaper}
      />

      {/* Panneau d'accès rapide */}
      <QuickPanel
        isOpen={quickPanelOpen}
        onClose={() => setQuickPanelOpen(false)}
        onOpenApp={openWindow}
      />
    </div>
  );
};
