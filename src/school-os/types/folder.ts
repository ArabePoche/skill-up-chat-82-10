/**
 * Types pour les dossiers du bureau School OS
 */

export interface DesktopFolder {
  id: string;
  name: string;
  color: string;
  appIds: string[];
  createdAt: string;
}

export interface FolderContextMenuProps {
  folder: DesktopFolder;
  onRename: (id: string, newName: string) => void;
  onDelete: (id: string) => void;
  onChangeColor: (id: string, color: string) => void;
}
