
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
  isOwnMessage?: boolean; // Si c'est le propre message de l'utilisateur
}

const MediaPreview: React.FC<MediaPreviewProps> = ({
  fileUrl,
  fileName,
  fileType,
  messageId,
  isTeacher = false,
  lessonId,
  formationId,
  isOwnMessage = false
}) => {
  // Fonction de mise à jour pour permettre l'édition des images
  const handleUpdate = (newUrl: string) => {
    console.log('Image updated:', newUrl);
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
      isOwnMessage={isOwnMessage}
    />
  );
};

export default MediaPreview;
