
import React, { useState } from 'react';
import { X, Upload, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAvatarUpload } from '@/profile/hooks/useAvatarUpload';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { mutate: uploadAvatar, isPending } = useAvatarUpload();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Vérification du type de fichier
      if (!file.type.startsWith('image/')) {
        toast.error(t('profile.selectImageFile'));
        return;
      }

      // Vérification de la taille (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(t('profile.fileTooLarge'));
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
      toast.error(t('profile.selectImage'));
      return;
    }

    uploadAvatar(selectedFile, {
      onSuccess: () => {
        onClose();
        setSelectedFile(null);
        setPreviewUrl(null);
        toast.success(t('profile.avatarUpdated'));
      },
      onError: (error) => {
        console.error('Erreur upload avatar:', error);
        toast.error(t('profile.avatarUpdateError'));
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
            {t('profile.editAvatar')}
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
                  alt={t('profile.preview')} 
                  className="w-full h-full object-cover"
                />
              ) : currentAvatarUrl ? (
                <img 
                  src={currentAvatarUrl} 
                  alt={t('profile.currentAvatar')} 
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
              <span>{t('profile.chooseImage')}</span>
            </label>
          </div>

          {selectedFile && (
            <div className="text-sm text-gray-600">
              <p>{t('profile.selectedFile')}: {selectedFile.name}</p>
              <p>{t('profile.size')}: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
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
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleUpload}
              className="flex-1"
              disabled={!selectedFile || isPending}
            >
              {isPending ? t('profile.uploading') : t('common.save')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AvatarUploadModal;