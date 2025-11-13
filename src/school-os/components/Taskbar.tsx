// Composant barre de tâches avec apps ouvertes
import React, { useState } from 'react';
import { Grid3x3, Search, Image } from 'lucide-react';
import { WindowState } from '../types';
import { getAppById } from '../apps';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface TaskbarProps {
  windows: WindowState[];
  onRestore: (id: string) => void;
  onOpenQuickPanel: () => void;
  onSearch: () => void;
  onChangeWallpaper: (url: string) => void;
}

export const Taskbar: React.FC<TaskbarProps> = ({
  windows,
  onRestore,
  onOpenQuickPanel,
  onSearch,
  onChangeWallpaper,
}) => {
  const [wallpaperDialogOpen, setWallpaperDialogOpen] = useState(false);
  const [wallpaperUrl, setWallpaperUrl] = useState('');

  const handleWallpaperChange = () => {
    if (wallpaperUrl) {
      onChangeWallpaper(wallpaperUrl);
      setWallpaperDialogOpen(false);
      setWallpaperUrl('');
    }
  };

  return (
    <>
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur-md border rounded-2xl shadow-2xl px-4 py-2 flex items-center gap-3 z-[9999]">
        {/* Bouton menu principal */}
        <button
          onClick={onOpenQuickPanel}
          className="w-12 h-12 rounded-xl bg-primary hover:bg-primary/90 flex items-center justify-center transition-colors"
        >
          <Grid3x3 className="w-6 h-6 text-primary-foreground" />
        </button>

        {/* Séparateur */}
        {windows.length > 0 && (
          <div className="w-px h-8 bg-border" />
        )}

        {/* Apps ouvertes */}
        {windows.map((window) => {
          const app = getAppById(window.appId);
          if (!app) return null;

          return (
            <button
              key={window.id}
              onClick={() => onRestore(window.id)}
              className="h-12 px-4 rounded-xl hover:bg-accent transition-colors flex items-center gap-2"
              style={{
                backgroundColor: window.isMinimized ? 'transparent' : 'hsl(var(--accent))',
              }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: app.color }}
              />
              <span className="text-sm font-medium max-w-[100px] truncate">
                {app.name}
              </span>
            </button>
          );
        })}

        {/* Bouton fond d'écran */}
        <button
          onClick={() => setWallpaperDialogOpen(true)}
          className="w-10 h-10 rounded-lg hover:bg-accent flex items-center justify-center transition-colors ml-auto"
          title="Changer le fond d'écran"
        >
          <Image className="w-5 h-5" />
        </button>
      </div>

      {/* Dialog pour changer le fond d'écran */}
      <Dialog open={wallpaperDialogOpen} onOpenChange={setWallpaperDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Changer le fond d'écran</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <Input
              placeholder="URL de l'image"
              value={wallpaperUrl}
              onChange={(e) => setWallpaperUrl(e.target.value)}
            />
            <Button onClick={handleWallpaperChange}>Appliquer</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
