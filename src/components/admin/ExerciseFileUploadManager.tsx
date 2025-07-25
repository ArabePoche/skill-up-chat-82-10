
import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, File, X, Download, AlertCircle, CheckCircle } from 'lucide-react';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useExerciseFiles } from '@/hooks/useExerciseFiles';
import { toast } from 'sonner';

interface ExerciseFileUploadManagerProps {
  exerciseId?: string;
  onFilesUpdate?: (files: { url: string; type: string; name?: string }[]) => void;
  maxFiles?: number;
}

const ExerciseFileUploadManager: React.FC<ExerciseFileUploadManagerProps> = ({
  exerciseId,
  onFilesUpdate,
  maxFiles = 5
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<{ url: string; type: string; name?: string }[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});

  const { uploadExerciseFile, isUploading } = useFileUpload();
  const { files: existingFiles, saveExerciseFiles } = useExerciseFiles(exerciseId);

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;

    const newFiles = Array.from(files).slice(0, maxFiles - selectedFiles.length);
    setSelectedFiles(prev => [...prev, ...newFiles]);
  }, [selectedFiles.length, maxFiles]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files);
    }
  }, [handleFileSelect]);

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (selectedFiles.length === 0) return;

    const uploadPromises = selectedFiles.map(async (file, index) => {
      try {
        console.log(`📤 Début upload fichier ${index + 1}:`, file.name);
        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
        
        const result = await uploadExerciseFile(file);
        console.log(`✅ Fichier ${index + 1} uploadé:`, result);
        
        setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
        
        return {
          url: result.fileUrl,
          type: result.fileType,
          name: result.fileName
        };
      } catch (error) {
        console.error(`❌ Erreur upload fichier ${file.name}:`, error);
        toast.error(`Erreur lors de l'upload de ${file.name}`);
        setUploadProgress(prev => ({ ...prev, [file.name]: -1 }));
        throw error;
      }
    });

    try {
      const results = await Promise.all(uploadPromises);
      const successfulUploads = results.filter(Boolean);
      
      setUploadedFiles(prev => [...prev, ...successfulUploads]);
      setSelectedFiles([]);
      setUploadProgress({});
      
      onFilesUpdate?.(successfulUploads);
      
      // Si on a un exerciseId, sauvegarder directement
      if (exerciseId) {
        await saveExerciseFiles(exerciseId, successfulUploads);
      }
      
      toast.success(`${successfulUploads.length} fichier(s) uploadé(s) avec succès`);
    } catch (error) {
      console.error('❌ Erreur lors de l\'upload des fichiers:', error);
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return '🖼️';
    if (file.type.startsWith('video/')) return '🎥';
    if (file.type.includes('pdf')) return '📄';
    if (file.type.includes('document')) return '📝';
    return '📎';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload size={20} />
          Fichiers d'exercice
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Zone de drop */}
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragActive 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-lg font-medium text-gray-900 mb-2">
            Glissez-déposez vos fichiers ici
          </p>
          <p className="text-sm text-gray-500 mb-4">
            ou cliquez pour sélectionner des fichiers
          </p>
          <input
            type="file"
            multiple
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
            id="file-upload"
            accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.mp4,.mov,.avi"
          />
          <label
            htmlFor="file-upload"
            className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Sélectionner des fichiers
          </label>
          <p className="text-xs text-gray-400 mt-2">
            Max {maxFiles} fichiers • PDF, images, vidéos, documents
          </p>
        </div>

        {/* Liste des fichiers sélectionnés */}
        {selectedFiles.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900">Fichiers sélectionnés:</h4>
            {selectedFiles.map((file, index) => (
              <div key={`${file.name}-${index}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{getFileIcon(file)}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900 truncate max-w-xs">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {uploadProgress[file.name] !== undefined && (
                    <div className="flex items-center space-x-2">
                      {uploadProgress[file.name] === -1 ? (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      ) : uploadProgress[file.name] === 100 ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      )}
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X size={16} />
                  </Button>
                </div>
              </div>
            ))}
            
            <Button
              onClick={uploadFiles}
              disabled={isUploading || selectedFiles.length === 0}
              className="w-full"
            >
              {isUploading ? 'Upload en cours...' : `Upload ${selectedFiles.length} fichier(s)`}
            </Button>
          </div>
        )}

        {/* Fichiers existants */}
        {existingFiles && existingFiles.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900">Fichiers existants:</h4>
            {existingFiles.map((file, index) => (
              <div key={`existing-${index}`} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <File className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 truncate max-w-xs">
                      {file.file_name || file.file_url.split('/').pop()}
                    </p>
                    <p className="text-xs text-gray-500">
                      {file.file_type}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(file.file_url, '_blank')}
                  className="text-blue-500 hover:text-blue-700"
                >
                  <Download size={16} />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ExerciseFileUploadManager;
