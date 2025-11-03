/**
 * Modal de soumission d'exercice avec gestion multi-fichiers
 * Permet l'upload de multiples fichiers (images, vidéos, documents, audio)
 * avec prévisualisation avant envoi
 */
import React, { useState, useRef } from 'react';
import { X, Upload, Trash2, FileText, Film, Music, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import CameraCapture from '@/components/chat/CameraCapture';
import AudioRecorder from '@/components/chat/AudioRecorder';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ExerciseSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (content: string, files: File[]) => void;
  isSubmitting: boolean;
  exerciseTitle: string;
}

interface FilePreview {
  file: File;
  preview: string;
  type: 'image' | 'video' | 'audio' | 'document';
}

const ExerciseSubmissionModal: React.FC<ExerciseSubmissionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  exerciseTitle,
}) => {
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<FilePreview[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileType = (file: File): 'image' | 'video' | 'audio' | 'document' => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    return 'document';
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    // Limite de 10 fichiers au total
    if (files.length + selectedFiles.length > 10) {
      toast.error('Maximum 10 fichiers autorisés');
      return;
    }

    const newPreviews: FilePreview[] = [];

    for (const file of selectedFiles) {
      const fileType = getFileType(file);
      let preview = '';

      // Créer une preview pour les images et vidéos
      if (fileType === 'image' || fileType === 'video') {
        preview = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        });
      }

      newPreviews.push({
        file,
        preview,
        type: fileType,
      });
    }

    setFiles([...files, ...newPreviews]);
    toast.success(`${selectedFiles.length} fichier(s) ajouté(s)`);
  };

  const handleCameraCapture = async (file: File) => {
    if (files.length >= 10) {
      toast.error('Maximum 10 fichiers autorisés');
      return;
    }

    const preview = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
    });

    setFiles([...files, {
      file,
      preview,
      type: 'image',
    }]);
    
    toast.success('Photo capturée');
  };

  const handleAudioCapture = (file: File) => {
    if (files.length >= 10) {
      toast.error('Maximum 10 fichiers autorisés');
      return;
    }

    setFiles([...files, {
      file,
      preview: '',
      type: 'audio',
    }]);
    
    toast.success('Audio enregistré');
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!content.trim() && files.length === 0) {
      toast.error('Veuillez ajouter du contenu ou des fichiers');
      return;
    }

    const filesList = files.map(f => f.file);
    onSubmit(content, filesList);
    
    // Reset form
    setContent('');
    setFiles([]);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setContent('');
      setFiles([]);
      onClose();
    }
  };

  const getFileIcon = (type: 'image' | 'video' | 'audio' | 'document') => {
    switch (type) {
      case 'image': return <ImageIcon size={20} />;
      case 'video': return <Film size={20} />;
      case 'audio': return <Music size={20} />;
      case 'document': return <FileText size={20} />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Soumettre l'exercice</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Titre de l'exercice */}
          <div className="bg-primary/10 p-3 rounded-lg">
            <p className="text-sm font-medium text-primary">{exerciseTitle}</p>
          </div>

          {/* Champ de texte */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Votre réponse
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Tapez votre réponse ici..."
              className="w-full h-32 p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={isSubmitting}
            />
            <div className="text-right text-xs text-muted-foreground mt-1">
              {content.length}/2000
            </div>
          </div>

          {/* Boutons d'ajout de fichiers */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Ajouter des fichiers ({files.length}/10)
            </label>
            <div className="flex flex-wrap gap-2">
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                className="hidden"
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
                multiple
              />
              
              <Button
                type="button"
                variant="actionBlue"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting || files.length >= 10}
                className="gap-1.5"
              >
                <Upload size={16} />
                <span>Fichiers</span>
              </Button>

              <CameraCapture
                onCapture={handleCameraCapture}
                disabled={isSubmitting || files.length >= 10}
              />

              <AudioRecorder
                onRecordingComplete={handleAudioCapture}
                disabled={isSubmitting || files.length >= 10}
              />
            </div>
          </div>

          {/* Prévisualisation des fichiers */}
          {files.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Fichiers à envoyer
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {files.map((filePreview, index) => (
                  <div
                    key={index}
                    className="relative group rounded-lg overflow-hidden border bg-muted"
                  >
                    {/* Preview */}
                    {filePreview.type === 'image' && filePreview.preview ? (
                      <img
                        src={filePreview.preview}
                        alt={filePreview.file.name}
                        className="w-full h-32 object-cover"
                      />
                    ) : filePreview.type === 'video' && filePreview.preview ? (
                      <video
                        src={filePreview.preview}
                        className="w-full h-32 object-cover"
                      />
                     ) : filePreview.type === 'audio' ? (
                      <div className="w-full h-32 flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 p-3">
                        <Music size={24} className="text-primary mb-2" />
                        <audio
                          controls
                          src={URL.createObjectURL(filePreview.file)}
                          className="w-full max-w-[200px]"
                          style={{ height: '32px' }}
                        />
                        
                      </div>
                    ) : (
                      <div className="w-full h-32 flex flex-col items-center justify-center bg-muted p-2">
                        {getFileIcon(filePreview.type)}
                        <p className="text-xs mt-2 text-center break-all px-1">
                          {filePreview.file.name}
                        </p>
                      </div>
                    )}

                    {/* Bouton supprimer */}
                    <button
                      onClick={() => removeFile(index)}
                      disabled={isSubmitting}
                      className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={14} />
                    </button>

                    {/* Nom du fichier en overlay */}
                    {(filePreview.type === 'image' || filePreview.type === 'video') && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-1">
                        <p className="text-white text-xs truncate px-1">
                          {filePreview.file.name}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Boutons d'action */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || (!content.trim() && files.length === 0)}
              className="bg-green-500 hover:bg-green-600"
            >
              {isSubmitting ? 'Envoi en cours...' : 'Soumettre'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExerciseSubmissionModal;
