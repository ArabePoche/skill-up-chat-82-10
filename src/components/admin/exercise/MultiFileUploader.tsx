import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, X, FileText, Image, Video, Music, AlertCircle, CheckCircle } from 'lucide-react';
import { useFileUpload } from '@/hooks/useFileUpload';
import { toast } from 'sonner';

interface ExerciseFile {
  url: string;
  type: string;
  name?: string;
  category?: 'image' | 'video' | 'audio' | 'document';
}

interface MultiFileUploaderProps {
  onFilesChange: (files: ExerciseFile[]) => void;
  existingFiles?: ExerciseFile[];
  disabled?: boolean;
  exerciseId?: string;
}

const MultiFileUploader: React.FC<MultiFileUploaderProps> = ({
  onFilesChange,
  existingFiles = [],
  disabled = false,
  exerciseId
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<ExerciseFile[]>(existingFiles);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { uploadExerciseFile, isUploading } = useFileUpload();

  const getFileCategory = (mimeType: string): 'image' | 'video' | 'audio' | 'document' => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'document';
  };

  const getFileIcon = (category: string) => {
    switch (category) {
      case 'image': return <Image size={16} className="text-green-600 flex-shrink-0" />;
      case 'video': return <Video size={16} className="text-blue-600 flex-shrink-0" />;
      case 'audio': return <Music size={16} className="text-purple-600 flex-shrink-0" />;
      default: return <FileText size={16} className="text-gray-600 flex-shrink-0" />;
    }
  };

  const getBgColor = (category: string) => {
    switch (category) {
      case 'image': return 'bg-green-50 border-green-200';
      case 'video': return 'bg-blue-50 border-blue-200';
      case 'audio': return 'bg-purple-50 border-purple-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    console.log('Fichiers sélectionnés:', files.map(f => `${f.name} (${f.type})`));
    
    // Vérifier la taille des fichiers (50MB max pour vidéo, 10MB pour autres)
    const validFiles = files.filter(file => {
      const isVideo = file.type.startsWith('video/');
      const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024; // 50MB ou 10MB
      
      if (file.size > maxSize) {
        toast.error(`${file.name} dépasse la taille limite (${isVideo ? '50MB' : '10MB'})`);
        return false;
      }
      return true;
    });
    
    setSelectedFiles(prev => [...prev, ...validFiles]);
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
        console.log('Upload du fichier:', file.name, 'type:', file.type, 'taille:', file.size);
        const result = await uploadExerciseFile(file);
        
        const category = getFileCategory(file.type);
        console.log('Résultat upload:', result, 'catégorie:', category);
        
        return {
          ...result,
          category
        };
      });

      const results = await Promise.all(uploadPromises);
      const newFiles: ExerciseFile[] = results.map(result => ({
        url: result.fileUrl,
        type: result.fileType,
        name: result.fileName,
        category: result.category
      }));

      console.log('Tous les fichiers uploadés:', newFiles);

      const allFiles = [...uploadedFiles, ...newFiles];
      setUploadedFiles(allFiles);
      onFilesChange(allFiles);
      setSelectedFiles([]);

      toast.success(`${newFiles.length} fichier(s) uploadé(s) avec succès`);
    } catch (error) {
      console.error('Erreur lors de l\'upload:', error);
      toast.error('Erreur lors de l\'upload des fichiers');
    } finally {
      setIsProcessing(false);
    }
  }, [selectedFiles, uploadedFiles, onFilesChange, uploadExerciseFile]);

  const isWorking = isUploading || isProcessing;

  const groupedFiles = uploadedFiles.reduce((acc, file, index) => {
    const category = file.category || getFileCategory(file.type);
    if (!acc[category]) acc[category] = [];
    acc[category].push({ ...file, originalIndex: index });
    return acc;
  }, {} as Record<string, (ExerciseFile & { originalIndex: number })[]>);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">
          Fichiers de l'exercice (supports multiples)
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
                accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif,.mp4,.mov,.avi,.mp3,.wav,.xlsx,.ppt,.pptx"
              />
            </div>
            <div className="mt-3 text-sm text-gray-500 space-y-1">
              <p><strong>Images:</strong> PNG, JPG, JPEG, GIF (max 10MB)</p>
              <p><strong>Vidéos:</strong> MP4, MOV, AVI (max 50MB)</p>
              <p><strong>Audio:</strong> MP3, WAV (max 10MB)</p>
              <p><strong>Documents:</strong> PDF, DOC, Excel, PowerPoint (max 10MB)</p>
            </div>
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
            {selectedFiles.map((file, index) => {
              const category = getFileCategory(file.type);
              return (
                <div key={index} className={`flex items-center justify-between p-2 rounded border ${getBgColor(category)}`}>
                  <div className="flex items-center space-x-2 min-w-0 flex-1">
                    {getFileIcon(category)}
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
              );
            })}
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

      {/* Fichiers uploadés groupés par catégorie */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium">Fichiers uploadés :</h4>
            <CheckCircle size={16} className="text-green-600" />
          </div>
          
          {Object.entries(groupedFiles).map(([category, files]) => (
            <div key={category} className="space-y-2">
              <h5 className="text-xs font-medium text-gray-700 capitalize flex items-center gap-1">
                {getFileIcon(category)}
                {category === 'image' ? 'Images' : 
                 category === 'video' ? 'Vidéos' :
                 category === 'audio' ? 'Audio' : 'Documents'} ({files.length})
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {files.map((file) => (
                  <div key={file.originalIndex} className={`flex items-center justify-between p-2 rounded border ${getBgColor(category)}`}>
                    <div className="flex items-center space-x-2 min-w-0 flex-1">
                      {getFileIcon(category)}
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
                      onClick={() => removeUploadedFile(file.originalIndex)}
                      disabled={disabled}
                      className="flex-shrink-0"
                    >
                      <X size={14} />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MultiFileUploader;