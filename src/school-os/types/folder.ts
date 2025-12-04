/**
 * Types pour les dossiers du bureau School OS
 * Les dossiers supportent une hiérarchie illimitée de sous-dossiers
 */

export interface FolderFile {
  id: string;
  name: string;
  url: string;
  type: string; // mime type
  size: number; // en bytes
  uploadedAt: string;
}

export interface DesktopFolder {
  id: string;
  name: string;
  color: string;
  files: FolderFile[];
  isPublic: boolean;
  createdAt: string;
  parentId?: string; // ID du dossier parent (undefined = dossier racine)
}

export interface FolderContextMenuProps {
  folder: DesktopFolder;
  onRename: (id: string, newName: string) => void;
  onDelete: (id: string) => void;
  onChangeColor: (id: string, color: string) => void;
}
