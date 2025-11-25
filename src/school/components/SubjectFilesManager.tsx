/**
 * Gestionnaire de fichiers de supports pour une matière
 * Affiche, upload et supprime les fichiers audiovisuels et documents
 */
import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Upload, Trash2, Download, Video, Music, FileImage, File } from 'lucide-react';
import { useSubjectFiles, useUploadSubjectFile, useDeleteSubjectFile } from '../hooks/useSubjectFiles';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface SubjectFilesManagerProps {
  subjectId: string;
}

const SubjectFilesManager: React.FC<SubjectFilesManagerProps> = ({ subjectId }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileToDelete, setFileToDelete] = React.useState<any>(null);

  const { data: files = [], isLoading } = useSubjectFiles(subjectId);
  const uploadFile = useUploadSubjectFile();
  const deleteFile = useDeleteSubjectFile();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    await uploadFile.mutateAsync({
      subject_id: subjectId,
      file,
    });

    // Réinitialiser l'input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteConfirm = async () => {
    if (!fileToDelete) return;
    await deleteFile.mutateAsync(fileToDelete);
    setFileToDelete(null);
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('video/')) return <Video className="w-5 h-5" />;
    if (fileType.startsWith('audio/')) return <Music className="w-5 h-5" />;
    if (fileType.startsWith('image/')) return <FileImage className="w-5 h-5" />;
    if (fileType.includes('pdf')) return <FileText className="w-5 h-5" />;
    return <File className="w-5 h-5" />;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (isLoading) {
    return <div className="text-muted-foreground">Chargement des fichiers...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Supports de cours</h3>
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadFile.isPending}
          size="sm"
        >
          <Upload className="w-4 h-4 mr-2" />
          {uploadFile.isPending ? 'Upload...' : 'Ajouter un fichier'}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
          accept="application/pdf,image/*,video/*,audio/*,.doc,.docx,.ppt,.pptx"
        />
      </div>

      {files.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
          <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Aucun fichier ajouté</p>
          <p className="text-sm">Cliquez sur "Ajouter un fichier" pour commencer</p>
        </div>
      ) : (
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="text-muted-foreground">
                  {getFileIcon(file.file_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{file.file_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(file.file_size)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(file.file_url, '_blank')}
                >
                  <Download className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFileToDelete(file)}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={!!fileToDelete} onOpenChange={(open) => !open && setFileToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le fichier ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer "{fileToDelete?.file_name}" ?
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SubjectFilesManager;
