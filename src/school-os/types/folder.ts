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
  isOwner?: boolean; // Indique si l'utilisateur courant est propriétaire du dossier
  createdAt: string;
  parentId?: string; // ID du dossier parent (undefined = dossier racine)
  positionX?: number; // Position X pour le tri dans le drag-drop
  positionY?: number; // Position Y pour le tri dans le drag-drop
}

export interface FolderContextMenuProps {
  folder: DesktopFolder;
  onRename: (id: string, newName: string) => void;
  onDelete: (id: string) => void;
  onChangeColor: (id: string, color: string) => void;
}
