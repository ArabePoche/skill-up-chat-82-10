/**
 * Fenêtre affichant le contenu d'un dossier (fichiers et sous-dossiers)
 * Supporte la navigation dans la hiérarchie
 */
import React, { useRef, useState } from 'react';
import { X, Folder, Trash2, Upload, Download, ChevronRight, Home, FolderPlus, Maximize2 } from 'lucide-react';
import { DesktopFolder, FolderFile } from '../types/folder';
import { Button } from '@/components/ui/button';
import { useFileUpload } from '@/hooks/useFileUpload';
import { toast } from 'sonner';
import { CreateFolderDialog } from './CreateFolderDialog';
import FileIcon from '@/components/ui/FileIcon';
import { ImageModal } from '@/components/ui/image-modal';

const isImageFile = (type: string) => type.startsWith('image/');

interface FolderWindowProps {
  folder: DesktopFolder;
  allFolders: DesktopFolder[];
  onClose: () => void;
  onAddFile: (file: Omit<FolderFile, 'id' | 'uploadedAt'>) => void;
  onRemoveFile: (fileId: string) => void;
  onNavigate: (folderId: string) => void;
  onCreateSubfolder: (name: string, color: string, isPublic: boolean) => void;
  onDeleteFolder: (folderId: string) => void;
  getFolderPath: (folderId: string) => DesktopFolder[];
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const FolderWindow: React.FC<FolderWindowProps> = ({
  folder,
  allFolders,
  onClose,
  onAddFile,
  onRemoveFile,
  onNavigate,
  onCreateSubfolder,
  onDeleteFolder,
  getFolderPath,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile, isUploading } = useFileUpload();
  const [createSubfolderOpen, setCreateSubfolderOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);

  // Récupérer les sous-dossiers du dossier actuel
  const childFolders = allFolders.filter(f => f.parentId === folder.id);
  const folderPath = getFolderPath(folder.id);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      if (file.type.startsWith('video/')) {
        toast.error(`Les vidéos ne sont pas autorisées: ${file.name}`);
        continue;
      }

      try {
        const result = await uploadFile(file, 'school_os_folders');
        onAddFile({
          name: file.name,
          url: result.fileUrl,
          type: file.type,
          size: file.size,
        });
        toast.success(`Fichier "${file.name}" ajouté`);
      } catch (error) {
        console.error('Erreur upload fichier:', error);
        toast.error(`Erreur lors de l'upload de ${file.name}`);
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDownload = (file: FolderFile) => {
    window.open(file.url, '_blank');
  };

  const handleCreateSubfolder = (name: string, color: string, isPublic: boolean) => {
    onCreateSubfolder(name, color, isPublic);
    setCreateSubfolderOpen(false);
  };

  const totalItems = folder.files.length + childFolders.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div 
        className="bg-background/95 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden border border-border/50"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between px-4 py-3 border-b border-border/50"
          style={{ backgroundColor: `${folder.color}15` }}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Folder 
              className="w-6 h-6 flex-shrink-0" 
              style={{ color: folder.color }}
              fill={folder.color}
              fillOpacity={0.3}
            />
            <span className="font-medium text-foreground truncate">{folder.name}</span>
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {totalItems} élément{totalItems > 1 ? 's' : ''}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 rounded-full flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Breadcrumb */}
        {folderPath.length > 1 && (
          <div className="flex items-center gap-1 px-4 py-2 bg-muted/30 border-b border-border/30 overflow-x-auto">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => onNavigate(folderPath[0].id)}
            >
              <Home className="w-3 h-3" />
            </Button>
            {folderPath.map((pathFolder, index) => (
              <React.Fragment key={pathFolder.id}>
                <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                <Button
                  variant={index === folderPath.length - 1 ? "secondary" : "ghost"}
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => onNavigate(pathFolder.id)}
                  disabled={index === folderPath.length - 1}
                >
                  {pathFolder.name}
                </Button>
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="p-4 min-h-[250px] max-h-[400px] overflow-auto">
          {totalItems === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <Folder className="w-12 h-12 mb-2 opacity-50" />
              <p className="text-sm">Ce dossier est vide</p>
              <p className="text-xs mt-1">Ajoutez des fichiers ou créez des sous-dossiers</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Sous-dossiers */}
              {childFolders.map((childFolder) => {
                const childCount = allFolders.filter(f => f.parentId === childFolder.id).length + childFolder.files.length;
                return (
                  <div
                    key={childFolder.id}
                    className="group flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer"
                    onDoubleClick={() => onNavigate(childFolder.id)}
                  >
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${childFolder.color}20` }}
                    >
                      <Folder 
                        className="w-5 h-5" 
                        style={{ color: childFolder.color }}
                        fill={childFolder.color}
                        fillOpacity={0.3}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {childFolder.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {childCount} élément{childCount > 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate(childFolder.id);
                        }}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteFolder(childFolder.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}

              {/* Fichiers */}
              {folder.files.map((file) => (
                  <div
                    key={file.id}
                    className="group flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors"
                  >
                    {isImageFile(file.type) ? (
                      <div 
                        className="w-10 h-10 rounded-lg flex-shrink-0 overflow-hidden cursor-pointer relative group/img"
                        onClick={() => setPreviewImage({ url: file.url, name: file.name })}
                      >
                        <img 
                          src={file.url} 
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                          <Maximize2 className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    ) : (
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-muted/50"
                      >
                        <FileIcon fileName={file.name} fileType={file.type} size="md" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {isImageFile(file.type) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setPreviewImage({ url: file.url, name: file.name })}
                        >
                          <Maximize2 className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDownload(file)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => onRemoveFile(file.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border/50 bg-muted/30 flex justify-between items-center gap-2">
          <p className="text-xs text-muted-foreground">
            Tous types de fichiers sauf vidéos
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreateSubfolderOpen(true)}
            >
              <FolderPlus className="w-4 h-4 mr-2" />
              Sous-dossier
            </Button>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              size="sm"
            >
              <Upload className="w-4 h-4 mr-2" />
              {isUploading ? 'Upload...' : 'Ajouter'}
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="*/*"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
      </div>

      {/* Dialog création sous-dossier */}
      <CreateFolderDialog
        open={createSubfolderOpen}
        onOpenChange={setCreateSubfolderOpen}
        onCreateFolder={handleCreateSubfolder}
      />

      {/* Modal prévisualisation image */}
      {previewImage && (
        <ImageModal
          isOpen={!!previewImage}
          onClose={() => setPreviewImage(null)}
          imageUrl={previewImage.url}
          fileName={previewImage.name}
        />
      )}
    </div>
  );
};
