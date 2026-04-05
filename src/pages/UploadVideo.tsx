import React from 'react';
import { useNavigate } from 'react-router-dom';
import VideoCreationFlowDialog from '@/components/admin/video/VideoCreationFlowDialog';

/**
 * Page de création de vidéo accessible depuis le profil utilisateur
 * Utilise le même composant que l'admin mais filtre les formations selon le rôle
 */
const UploadVideo = () => {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate('/profil');
  };

  const handleCancel = () => {
    navigate('/profil');
  };

  return (
    <VideoCreationFlowDialog
      open={true}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          handleCancel();
        }
      }}
      onSuccess={handleSuccess}
    />
  );
};

export default UploadVideo;
