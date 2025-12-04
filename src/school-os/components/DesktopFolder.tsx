/**
 * Composant dossier affichable sur le bureau avec support drag-and-drop
 */
import React, { useState } from 'react';
import { Folder, Trash2, Edit2, Palette } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DesktopFolder } from '../types/folder';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const FOLDER_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#06B6D4', '#F97316',
];

interface DesktopFolderProps {
  folder: DesktopFolder;
  onOpen: (folderId: string) => void;
  onRename: (folderId: string, newName: string) => void;
  onDelete: (folderId: string) => void;
  onChangeColor: (folderId: string, color: string) => void;
  className?: string;
}

export const DesktopFolderIcon: React.FC<DesktopFolderProps> = ({
  folder,
  onOpen,
  onRename,
  onDelete,
  onChangeColor,
  className,
}) => {
  const fileCount = folder.files?.length || 0;
  const [renameOpen, setRenameOpen] = useState(false);
  const [newName, setNewName] = useState(folder.name);

  // Support drag-and-drop avec préfixe pour différencier des apps
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `folder-${folder.id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleRename = () => {
    if (newName.trim()) {
      onRename(folder.id, newName.trim());
      setRenameOpen(false);
    }
  };

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger>
          <div
            ref={setNodeRef}
            style={style}
            className={`flex flex-col items-center gap-2 p-3 rounded-xl cursor-pointer
              hover:bg-white/10 transition-all duration-200 group ${className}`}
            {...attributes}
            {...listeners}
            onDoubleClick={() => !isDragging && onOpen(folder.id)}
          >
            <div 
              className="relative w-16 h-16 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105"
              style={{ backgroundColor: `${folder.color}20` }}
            >
              <Folder 
                className="w-10 h-10" 
                style={{ color: folder.color }}
                fill={folder.color}
                fillOpacity={0.3}
              />
              {fileCount > 0 && (
                <span 
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-white text-xs flex items-center justify-center font-medium"
                  style={{ backgroundColor: folder.color }}
                >
                  {fileCount}
                </span>
              )}
            </div>
            <span className="text-white text-sm text-center drop-shadow-lg max-w-[80px] truncate">
              {folder.name}
            </span>
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent className="w-48">
          <ContextMenuItem onClick={() => onOpen(folder.id)}>
            <Folder className="w-4 h-4 mr-2" />
            Ouvrir
          </ContextMenuItem>
          
          <ContextMenuItem onClick={() => {
            setNewName(folder.name);
            setRenameOpen(true);
          }}>
            <Edit2 className="w-4 h-4 mr-2" />
            Renommer
          </ContextMenuItem>

          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <Palette className="w-4 h-4 mr-2" />
              Changer la couleur
            </ContextMenuSubTrigger>
            <ContextMenuSubContent>
              <div className="flex flex-wrap gap-1 p-2 w-36">
                {FOLDER_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => onChangeColor(folder.id, color)}
                    className={`w-6 h-6 rounded transition-transform hover:scale-110 ${
                      folder.color === color ? 'ring-2 ring-white' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </ContextMenuSubContent>
          </ContextMenuSub>

          <ContextMenuSeparator />

          <ContextMenuItem 
            onClick={() => onDelete(folder.id)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Supprimer
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Renommer le dossier</DialogTitle>
          </DialogHeader>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nom du dossier"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleRename}>Renommer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
