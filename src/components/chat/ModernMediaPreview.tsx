import React, { useState } from 'react';
import { Download, Maximize2, X, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import LessonVideoPlayer from '../LessonVideoPlayer';
import ImageAnnotationModal from './ImageAnnotationModal';
import SimpleImageEditor from './SimpleImageEditor';
// Composants offline-first pour les médias
import { OfflineImage } from '@/file-manager/components/OfflineImage';
import { OfflineVideo } from '@/file-manager/components/OfflineVideo';
import { OfflineAudio } from '@/file-manager/components/OfflineAudio';

interface ModernMediaPreviewProps {
  fileUrl: string;
  fileName: string;
  fileType?: string;
  className?: string;
  fullscreen?: boolean;
  onClose?: () => void;
  onUpdate?: (newUrl: string) => void;
  messageId?: string;
  isTeacher?: boolean;
  lessonId?: string;
  formationId?: string;
  isOwnMessage?: boolean; // Si c'est le propre message de l'utilisateur - fichier déjà local
}

const ModernMediaPreview: React.FC<ModernMediaPreviewProps> = ({
  fileUrl,
  fileName,
  fileType,
  className = "",
  fullscreen = false,
  onClose,
  onUpdate,
  messageId,
  isTeacher = false,
  lessonId,
  formationId,
  isOwnMessage = false
}) => {
const [showFullscreen, setShowFullscreen] = useState(false);
  const [showAnnotationModal, setShowAnnotationModal] = useState(false);

  const isImage = fileType?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(fileName);
  // ⚠️ IMPORTANT: Vérifier audio AVANT vidéo car .webm et .ogg peuvent être les deux
  // Si fileType commence par audio/, c'est un audio même si l'extension est ambiguë
  const isAudio = fileType?.startsWith('audio/') || /\.(mp3|wav|m4a|aac|flac)$/i.test(fileName);
  // Vidéo seulement si ce n'est PAS de l'audio (évite les conflits .webm/.ogg)
  const isVideo = !isAudio && (fileType?.startsWith('video/') || /\.(mp4|webm|ogg|avi|mov|mkv)$/i.test(fileName));
  const isYouTubeVideo = fileUrl.includes('youtube.com') || fileUrl.includes('youtu.be');
  const isPDF = fileType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    link.click();
  };

  const handleFullscreen = () => {
    setShowFullscreen(true);
  };

  const handleAnnotate = () => {
    if (!lessonId || !formationId) {
      console.error('lessonId and formationId are required for annotation');
      return;
    }
    setShowAnnotationModal(true);
  };

  if (fullscreen) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-2">
          <div className="relative">
            <div className="absolute top-2 right-2 z-10 flex gap-2">
              {isImage && isTeacher && lessonId && formationId && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleAnnotate}
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
                  title="Annoter l'image pour correction"
                >
                  <Edit3 size={16} className="mr-1" />
                  Annoter
                </Button>
              )}
              {isImage && onUpdate && (
                <SimpleImageEditor
                  fileUrl={fileUrl}
                  fileName={fileName}
                  onUpdate={onUpdate}
                />
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownload}
                className="bg-black/50 text-white hover:bg-black/70"
              >
                <Download size={16} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="bg-black/50 text-white hover:bg-black/70"
                onClick={onClose}
              >
                <X size={16} />
              </Button>
            </div>
            
            {isImage && (
              <OfflineImage
                src={fileUrl}
                alt={fileName}
                className="max-w-full max-h-[90vh] object-contain mx-auto"
                autoDownload={false}
              />
            )}
            
            {(isVideo || isYouTubeVideo) && (
              <div className="w-full max-h-[90vh]">
                <LessonVideoPlayer url={fileUrl} className="w-full" />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const content = (
    <>
      {isImage && (
        <div className="relative group">
          <div
            onClick={() => {
              if (lessonId && formationId && isTeacher) {
                handleAnnotate();
              } else {
                handleFullscreen();
              }
            }}
            className="cursor-pointer"
          >
            <OfflineImage
              src={fileUrl}
              alt={fileName}
              className={`w-full max-w-xs sm:max-w-sm max-h-48 sm:max-h-64 object-contain rounded-lg ${className}`}
              autoDownload={false}
            />
          </div>
          {/* Bouton d'annotation visible pour les profs */}
          {isTeacher && lessonId && formationId && (
            <div className="absolute top-2 right-2 z-10">
              <Button
                variant="default"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAnnotate();
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
                title="Annoter l'image pour correction"
              >
                <Edit3 size={16} className="mr-1" />
                Annoter
              </Button>
            </div>
          )}
          {/* Bouton plein écran pour tous */}
          {!isTeacher && (
            <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleFullscreen();
                }}
                className="bg-black/50 text-white hover:bg-black/70"
              >
                <Maximize2 size={16} />
              </Button>
            </div>
          )}
        </div>
      )}

      {isAudio && (
        <OfflineAudio
          src={fileUrl}
          fileName={fileName}
          autoDownload={false}
          className="max-w-xs sm:max-w-sm"
        />
      )}

      {(isVideo && !isYouTubeVideo) && (
        <OfflineVideo
          src={fileUrl}
          autoDownload={false}
          className={`max-w-xs sm:max-w-sm ${className}`}
        />
      )}

      {isYouTubeVideo && (
        <div className="max-w-xs sm:max-w-sm">
          <LessonVideoPlayer url={fileUrl} className="w-full" />
        </div>
      )}


      {!isImage && !isVideo && !isAudio && !isPDF && (
        <div className="bg-gray-50 p-3 sm:p-4 rounded-lg max-w-xs sm:max-w-sm border">
          <div className="flex items-center gap-2 mb-2 sm:mb-3">
            <div className="bg-gray-500 p-1.5 sm:p-2 rounded-full text-white text-xs font-bold">
              FILE
            </div>
            <span className="font-medium text-xs sm:text-sm truncate">{fileName}</span>
          </div>
          {/* Masquer le bouton télécharger pour l'expéditeur - fichier déjà local */}
          {!isOwnMessage && (
            <Button variant="outline" size="sm" onClick={handleDownload} className="w-full text-xs sm:text-sm">
              <Download size={14} className="mr-1" />
              Télécharger
            </Button>
          )}
        </div>
      )}

      {showFullscreen && (
        <ModernMediaPreview
          fileUrl={fileUrl}
          fileName={fileName}
          fileType={fileType}
          fullscreen={true}
          onClose={() => setShowFullscreen(false)}
        />
      )}

      {showAnnotationModal && lessonId && formationId && (
        <ImageAnnotationModal
          isOpen={showAnnotationModal}
          onClose={() => setShowAnnotationModal(false)}
          imageUrl={fileUrl}
          fileName={fileName}
          messageId={messageId || ''}
          isTeacher={isTeacher}
          lessonId={lessonId}
          formationId={formationId}
        />
      )}
    </>
  );

  return content;
};

export default ModernMediaPreview;