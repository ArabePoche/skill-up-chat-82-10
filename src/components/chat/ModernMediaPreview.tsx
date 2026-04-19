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
import { downloadFile } from '@/file-manager/utils/downloadFile';

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
  isOwnMessage?: boolean;
  authorName?: string;
  authorAvatarUrl?: string; // Add new props
  timeLabel?: string;
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
  isOwnMessage = false,
  authorName,
  authorAvatarUrl,
  timeLabel,
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
  const fileExtension = fileName.split('.').pop()?.toUpperCase() || (isPDF ? 'PDF' : 'FILE');

  const handleDownload = () => {
    downloadFile(fileUrl, fileName, fileType);
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
                    className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-md p-0 flex items-center justify-center"
                    onClick={handleAnnotate}
                    title="Annoter l'image pour correction"
                  >
                    <Edit3 size={14} />
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
                autoDownload={isOwnMessage}
              />
            )}
            
            {(isVideo || isYouTubeVideo) && (
              <div className="w-full max-h-[90vh]">
                <LessonVideoPlayer 
                  url={fileUrl} 
                  className="w-full" 
                  lessonId={lessonId}
                  authorName={authorName}
                  authorAvatarUrl={authorAvatarUrl}
                />
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
        <div className="relative group w-fit">
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
              className={`h-auto w-auto max-w-[min(70vw,20rem)] sm:max-w-sm max-h-64 object-cover ${className || 'rounded-lg'}`}
              autoDownload={isOwnMessage}
            />
          </div>
          {timeLabel && (
            <div className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
              {timeLabel}
            </div>
          )}
          {/* Bouton d'annotation visible pour les profs */}
          {isTeacher && lessonId && formationId && (
            <div className="absolute top-2 right-2 z-10">
              <Button
                  variant="default"
                  className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-md p-0 flex items-center justify-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAnnotate();
                  }}
                  title="Annoter l'image pour correction"
                >
                  <Edit3 size={14} />
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
        <div className="relative max-w-xs sm:max-w-sm">
          <OfflineAudio
            src={fileUrl}
            fileName={fileName}
            autoDownload={isOwnMessage}
            className="max-w-xs sm:max-w-sm"
          />
          {timeLabel && (
            <div className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
              {timeLabel}
            </div>
          )}
        </div>
      )}

      {(isVideo && !isYouTubeVideo) && (
        <div className="relative w-fit max-w-xs sm:max-w-sm">
          <OfflineVideo
            src={fileUrl}
            autoDownload={isOwnMessage}
            className={className}
          />
          {timeLabel && (
            <div className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
              {timeLabel}
            </div>
          )}
        </div>
      )}

      {isYouTubeVideo && (
        <div className="relative max-w-xs sm:max-w-sm">
          <LessonVideoPlayer 
            url={fileUrl} 
            className="w-full"
            lessonId={lessonId} 
            authorName={authorName}
            authorAvatarUrl={authorAvatarUrl}
          />
          {timeLabel && (
            <div className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
              {timeLabel}
            </div>
          )}
        </div>
      )}

      {!isImage && !isVideo && !isAudio && (
        <div className="relative max-w-xs sm:max-w-sm">
          <div className="rounded-lg border bg-gray-50 px-3 py-3 sm:px-4 sm:py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-gray-600 px-2 py-1 text-[10px] font-bold tracking-[0.16em] text-white">
                  {fileExtension}
                </div>
                <span className="text-xs font-medium text-gray-600 sm:text-sm">
                  {isPDF ? 'Document PDF' : 'Fichier partagé'}
                </span>
              </div>
              {!isOwnMessage && (
                <Button variant="outline" size="sm" onClick={handleDownload} className="h-8 px-3 text-xs sm:text-sm">
                  <Download size={14} className="mr-1" />
                  Télécharger
                </Button>
              )}
            </div>
          </div>
          {timeLabel && (
            <div className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
              {timeLabel}
            </div>
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