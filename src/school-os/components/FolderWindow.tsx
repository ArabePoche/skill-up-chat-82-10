/**
 * Fenêtre affichant le contenu d'un dossier (fichiers uniquement)
 */
import React, { useRef } from 'react';
import { X, Folder, Trash2, Upload, FileText, FileImage, File, Download } from 'lucide-react';
import { DesktopFolder, FolderFile } from '../types/folder';
import { Button } from '@/components/ui/button';
import { useFileUpload } from '@/hooks/useFileUpload';
import { toast } from 'sonner';

interface FolderWindowProps {
  folder: DesktopFolder;
  onClose: () => void;
  onAddFile: (file: Omit<FolderFile, 'id' | 'uploadedAt'>) => void;
  onRemoveFile: (fileId: string) => void;
}

const getFileIcon = (type: string) => {
  if (type.startsWith('image/')) return FileImage;
  if (type.includes('pdf') || type.includes('document') || type.includes('text')) return FileText;
  return File;
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const FolderWindow: React.FC<FolderWindowProps> = ({
  folder,
  onClose,
  onAddFile,
  onRemoveFile,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile, isUploading } = useFileUpload();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      // Bloquer les vidéos
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

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDownload = (file: FolderFile) => {
    window.open(file.url, '_blank');
  };

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
              {folder.files.length} fichier{folder.files.length > 1 ? 's' : ''}
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
          {folder.files.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <Folder className="w-12 h-12 mb-2 opacity-50" />
              <p className="text-sm">Ce dossier est vide</p>
              <p className="text-xs mt-1">Cliquez sur "Ajouter" pour importer des fichiers</p>
            </div>
          ) : (
            <div className="space-y-2">
              {folder.files.map((file) => {
                const IconComponent = getFileIcon(file.type);
                return (
                  <div
                    key={file.id}
                    className="group flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors"
                  >
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${folder.color}20` }}
                    >
                      <IconComponent className="w-5 h-5" style={{ color: folder.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                );
              })}
            </div>
          )}
        </div>

        {/* Footer avec bouton d'ajout */}
        <div className="px-4 py-3 border-t border-border/50 bg-muted/30 flex justify-between items-center">
          <p className="text-xs text-muted-foreground">
            Tous types de fichiers sauf vidéos
          </p>
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            size="sm"
          >
            <Upload className="w-4 h-4 mr-2" />
            {isUploading ? 'Upload...' : 'Ajouter'}
          </Button>
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
    </div>
  );
};
