/**
 * Types pour les dossiers du bureau School OS
 * Les dossiers contiennent uniquement des fichiers (pas d'applications)
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
}

export interface FolderContextMenuProps {
  folder: DesktopFolder;
  onRename: (id: string, newName: string) => void;
  onDelete: (id: string) => void;
  onChangeColor: (id: string, color: string) => void;
}
