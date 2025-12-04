/**
 * Fenêtre affichant le contenu d'un dossier
 */
import React from 'react';
import { X, Folder, Trash2 } from 'lucide-react';
import { DesktopFolder } from '../types/folder';
import { SchoolApp } from '../types';
import { Button } from '@/components/ui/button';

interface FolderWindowProps {
  folder: DesktopFolder;
  apps: SchoolApp[];
  onClose: () => void;
  onOpenApp: (appId: string) => void;
  onRemoveApp: (appId: string) => void;
}

export const FolderWindow: React.FC<FolderWindowProps> = ({
  folder,
  apps,
  onClose,
  onOpenApp,
  onRemoveApp,
}) => {
  const folderApps = apps.filter(app => folder.appIds.includes(app.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div 
        className="bg-background/95 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden border border-border/50"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between px-4 py-3 border-b border-border/50"
          style={{ backgroundColor: `${folder.color}15` }}
        >
          <div className="flex items-center gap-3">
            <Folder 
              className="w-6 h-6" 
              style={{ color: folder.color }}
              fill={folder.color}
              fillOpacity={0.3}
            />
            <span className="font-medium text-foreground">{folder.name}</span>
            <span className="text-xs text-muted-foreground">
              {folderApps.length} application{folderApps.length > 1 ? 's' : ''}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 rounded-full"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 min-h-[200px] max-h-[400px] overflow-auto">
          {folderApps.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <Folder className="w-12 h-12 mb-2 opacity-50" />
              <p className="text-sm">Ce dossier est vide</p>
              <p className="text-xs mt-1">Glissez des applications ici</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-4">
              {folderApps.map((app) => {
                const IconComponent = app.icon;
                return (
                  <div
                    key={app.id}
                    className="relative group flex flex-col items-center gap-2 p-3 rounded-xl cursor-pointer hover:bg-muted/50 transition-colors"
                    onDoubleClick={() => {
                      onOpenApp(app.id);
                      onClose();
                    }}
                  >
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${app.color}20` }}
                    >
                      <IconComponent className="w-6 h-6" style={{ color: app.color }} />
                    </div>
                    <span className="text-xs text-center text-foreground truncate max-w-full">
                      {app.name}
                    </span>
                    
                    {/* Remove button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveApp(app.id);
                      }}
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground 
                        opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-border/50 bg-muted/30">
          <p className="text-xs text-muted-foreground text-center">
            Double-cliquez pour ouvrir une application
          </p>
        </div>
      </div>
    </div>
  );
};
