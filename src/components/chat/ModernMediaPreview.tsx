import React, { useState } from 'react';
import { Download, Eye, Maximize2, X, Edit3, Play, Pause, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import LessonVideoPlayer from '../LessonVideoPlayer';
import ImageAnnotationModal from './ImageAnnotationModal';
import SimpleImageEditor from './SimpleImageEditor';

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
  formationId
}) => {
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [showAnnotationModal, setShowAnnotationModal] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const isImage = fileType?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(fileName);
  const isVideo = fileType?.startsWith('video/') || /\.(mp4|webm|ogg|avi|mov)$/i.test(fileName);
  const isYouTubeVideo = fileUrl.includes('youtube.com') || fileUrl.includes('youtu.be');
  const isAudio = fileType?.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|webm)$/i.test(fileName);
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (fullscreen) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-2">
          <div className="relative">
            <div className="absolute top-2 right-2 z-10 flex gap-2">
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
              <img
                src={fileUrl}
                alt={fileName}
                className="max-w-full max-h-[90vh] object-contain mx-auto"
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
        <div className="relative">
          <img
            src={fileUrl}
            alt={fileName}
            className={`w-full max-w-xs sm:max-w-sm max-h-48 sm:max-h-64 object-contain rounded-lg cursor-pointer ${className}`}
            loading="lazy"
            onClick={() => {
              if (lessonId && formationId && isTeacher) {
                handleAnnotate();
              } else {
                handleFullscreen();
              }
            }}
          />
        </div>
      )}

      {isAudio && (
        

          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center gap-2">
              <audio
                controls
                className="flex-1 h-6 sm:h-8"
                style={{ height: '24px' }}
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              >
                <source src={fileUrl} type={fileType} />
                Votre navigateur ne supporte pas l'élément audio.
              </audio>

              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="text-xs sm:text-sm"
              >
                <Download size={14} className="mr-1" />
              </Button>
            </div>
          </div>
        
      )}


      {!isImage && !isVideo && !isYouTubeVideo && !isAudio && !isPDF && (
        <div className="bg-gray-50 p-3 sm:p-4 rounded-lg max-w-xs sm:max-w-sm border">
          <div className="flex items-center gap-2 mb-2 sm:mb-3">
            <div className="bg-gray-500 p-1.5 sm:p-2 rounded-full text-white text-xs font-bold">
              FILE
            </div>
            <span className="font-medium text-xs sm:text-sm truncate">{fileName}</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleDownload} className="w-full text-xs sm:text-sm">
            <Download size={14} className="mr-1" />
            Télécharger
          </Button>
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