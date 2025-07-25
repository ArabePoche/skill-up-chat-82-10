
import React, { useState } from 'react';
import { X, Upload, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAvatarUpload } from '@/hooks/useAvatarUpload';
import { toast } from 'sonner';

interface AvatarUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAvatarUrl?: string;
}

const AvatarUploadModal: React.FC<AvatarUploadModalProps> = ({
  isOpen,
  onClose,
  currentAvatarUrl
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { mutate: uploadAvatar, isPending } = useAvatarUpload();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Vérification du type de fichier
      if (!file.type.startsWith('image/')) {
        toast.error('Veuillez sélectionner un fichier image');
        return;
      }

      // Vérification de la taille (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Le fichier est trop volumineux (max 5MB)');
        return;
      }

      setSelectedFile(file);
      
      // Créer un aperçu
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = () => {
    if (!selectedFile) {
      toast.error('Veuillez sélectionner une image');
      return;
    }

    uploadAvatar(selectedFile, {
      onSuccess: () => {
        onClose();
        setSelectedFile(null);
        setPreviewUrl(null);
        toast.success('Photo de profil mise à jour !');
      },
      onError: (error) => {
        console.error('Erreur upload avatar:', error);
        toast.error('Erreur lors de la mise à jour de la photo');
      }
    });
  };

  const handleClose = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Modifier la photo de profil
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Aperçu de l'image */}
          <div className="flex justify-center">
            <div className="w-32 h-32 bg-gradient-to-r from-edu-primary to-edu-secondary rounded-full flex items-center justify-center overflow-hidden">
              {previewUrl ? (
                <img 
                  src={previewUrl} 
                  alt="Aperçu" 
                  className="w-full h-full object-cover"
                />
              ) : currentAvatarUrl ? (
                <img 
                  src={currentAvatarUrl} 
                  alt="Avatar actuel" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <Camera className="text-white" size={40} />
              )}
            </div>
          </div>

          {/* Sélection de fichier */}
          <div>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              id="avatar-upload"
            />
            <label
              htmlFor="avatar-upload"
              className="w-full flex items-center justify-center gap-2 py-2 px-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-edu-primary cursor-pointer transition-colors"
            >
              <Upload size={20} />
              <span>Choisir une image</span>
            </label>
          </div>

          {selectedFile && (
            <div className="text-sm text-gray-600">
              <p>Fichier sélectionné: {selectedFile.name}</p>
              <p>Taille: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1"
              disabled={isPending}
            >
              Annuler
            </Button>
            <Button
              onClick={handleUpload}
              className="flex-1"
              disabled={!selectedFile || isPending}
            >
              {isPending ? 'Upload...' : 'Enregistrer'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AvatarUploadModal;