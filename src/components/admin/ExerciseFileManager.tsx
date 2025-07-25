import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, X, File, AlertCircle, CheckCircle } from 'lucide-react';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useExerciseFiles } from '@/hooks/useExerciseFiles';
import { toast } from 'sonner';

interface ExerciseFile {
  url: string;
  type: string;
  name?: string;
}

interface ExerciseFileManagerProps {
  exerciseId?: string;
  onFilesChange: (files: ExerciseFile[]) => void;
  disabled?: boolean;
}

const ExerciseFileManager: React.FC<ExerciseFileManagerProps> = ({
  exerciseId,
  onFilesChange,
  disabled = false
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<ExerciseFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { uploadExerciseFile, isUploading } = useFileUpload();
  const { saveExerciseFiles } = useExerciseFiles(exerciseId);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    console.log('Fichiers sélectionnés:', files.map(f => f.name));
    setSelectedFiles(prev => [...prev, ...files]);
  }, []);

  const removeSelectedFile = useCallback((index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const removeUploadedFile = useCallback((index: number) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(newFiles);
    onFilesChange(newFiles);
  }, [uploadedFiles, onFilesChange]);

  const uploadFiles = useCallback(async () => {
    if (selectedFiles.length === 0) {
      toast.error('Aucun fichier sélectionné');
      return;
    }

    setIsProcessing(true);
    console.log('Début upload vers bucket lessons_exercises_files:', selectedFiles.length, 'fichiers');

    try {
      const uploadPromises = selectedFiles.map(async (file) => {
        console.log('Upload du fichier:', file.name, 'taille:', file.size);
        const result = await uploadExerciseFile(file);
        console.log('Résultat upload:', result);
        return result;
      });

      const results = await Promise.all(uploadPromises);
      const newFiles: ExerciseFile[] = results.map(result => ({
        url: result.fileUrl,
        type: result.fileType,
        name: result.fileName
      }));

      console.log('Tous les fichiers uploadés:', newFiles);

      const allFiles = [...uploadedFiles, ...newFiles];
      setUploadedFiles(allFiles);
      onFilesChange(allFiles);
      setSelectedFiles([]);

      // Sauvegarder dans la base de données si exerciseId existe
      if (exerciseId) {
        console.log('Sauvegarde en base pour exercice:', exerciseId);
        await saveExerciseFiles(exerciseId, allFiles);
      }

      toast.success(`${newFiles.length} fichier(s) uploadé(s) avec succès`);
    } catch (error) {
      console.error('Erreur lors de l\'upload:', error);
      toast.error('Erreur lors de l\'upload des fichiers');
    } finally {
      setIsProcessing(false);
    }
  }, [selectedFiles, uploadedFiles, onFilesChange, exerciseId, uploadExerciseFile, saveExerciseFiles]);

  const isWorking = isUploading || isProcessing;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">
          Fichiers de l'exercice
          {isWorking && <span className="ml-2 text-blue-600">⏳ Traitement en cours...</span>}
        </label>
        
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
          <div className="text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <div className="mt-2">
              <Input
                type="file"
                multiple
                onChange={handleFileSelect}
                disabled={disabled || isWorking}
                className="cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.xlsx,.ppt,.pptx"
              />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              PDF, DOC, images, Excel, PowerPoint (max 10MB par fichier)
            </p>
          </div>
        </div>
      </div>

      {/* Fichiers sélectionnés (en attente d'upload) */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium">Fichiers sélectionnés :</h4>
            <AlertCircle size={16} className="text-yellow-600" />
          </div>
          <div className="max-h-32 overflow-y-auto space-y-2 pr-2">
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between bg-yellow-50 p-2 rounded border border-yellow-200">
                <div className="flex items-center space-x-2 min-w-0 flex-1">
                  <File size={16} className="text-yellow-600 flex-shrink-0" />
                  <span className="text-sm truncate">{file.name}</span>
                  <span className="text-xs text-gray-500 flex-shrink-0">
                    ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeSelectedFile(index)}
                  disabled={disabled || isWorking}
                  className="flex-shrink-0"
                >
                  <X size={14} />
                </Button>
              </div>
            ))}
          </div>
          <Button
            onClick={uploadFiles}
            disabled={disabled || isWorking || selectedFiles.length === 0}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {isWorking ? (
              <>⏳ Upload en cours...</>
            ) : (
              <>📤 Uploader {selectedFiles.length} fichier(s)</>
            )}
          </Button>
        </div>
      )}

      {/* Fichiers uploadés */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium">Fichiers uploadés :</h4>
            <CheckCircle size={16} className="text-green-600" />
          </div>
          <div className="max-h-32 overflow-y-auto space-y-2 pr-2">
            {uploadedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between bg-green-50 p-2 rounded border border-green-200">
                <div className="flex items-center space-x-2 min-w-0 flex-1">
                  <File size={16} className="text-green-600 flex-shrink-0" />
                  <a 
                    href={file.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline truncate"
                  >
                    {file.name || 'Fichier'}
                  </a>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeUploadedFile(index)}
                  disabled={disabled}
                  className="flex-shrink-0"
                >
                  <X size={14} />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExerciseFileManager;
