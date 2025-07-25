
import React from 'react';
import ModernMediaPreview from './ModernMediaPreview';

interface MediaPreviewProps {
  fileUrl: string;
  fileName: string;
  fileType?: string;
  messageId?: string;
  isTeacher?: boolean;
  lessonId?: string;
  formationId?: string;
}

const MediaPreview: React.FC<MediaPreviewProps> = ({
  fileUrl,
  fileName,
  fileType,
  messageId,
  isTeacher = false,
  lessonId,
  formationId
}) => {
  // Fonction de mise à jour pour permettre l'édition des images
  const handleUpdate = (newUrl: string) => {
    console.log('Image updated:', newUrl);
    // Cette fonction pourrait être étendue pour mettre à jour le message en base
    // Pour l'instant, on log juste pour confirmer que l'édition fonctionne
  };

  return (
    <ModernMediaPreview
      fileUrl={fileUrl}
      fileName={fileName}
      fileType={fileType}
      messageId={messageId}
      isTeacher={isTeacher}
      lessonId={lessonId}
      formationId={formationId}
      onUpdate={handleUpdate}
    />
  );
};

export default MediaPreview;
