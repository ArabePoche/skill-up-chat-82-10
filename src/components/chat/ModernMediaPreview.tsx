
import React, { useState } from 'react';
import { Download, Eye, Maximize2, X, Edit3, Play, Pause, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import LessonVideoPlayer from '../LessonVideoPlayer';
import ImageAnnotationModal from './ImageAnnotationModal';
import SimpleImageEditor from './SimpleImageEditor';
import ModernAudioPlayer from './ModernAudioPlayer';

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

  if (fullscreen) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-2">
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 z-10 bg-black/50 text-white hover:bg-black/70"
              onClick={onClose}
            >
              <X size={16} />
            </Button>
            
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
        <div className="relative group">
          <img
            src={fileUrl}
            alt={fileName}
            className={`w-full max-w-xs sm:max-w-sm max-h-48 sm:max-h-64 object-contain rounded-lg ${className}`}
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
            <div className="flex gap-1 sm:gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleFullscreen}
                className="bg-white/90 hover:bg-white shadow-sm p-1 sm:p-2"
                title="Voir en plein écran"
              >
                <Maximize2 size={14} className="sm:w-4 sm:h-4" />
              </Button>
              
              {lessonId && formationId && isTeacher && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleAnnotate}
                  className="bg-white/90 hover:bg-white shadow-sm p-1 sm:p-2"
                  title="Annoter l'image"
                >
                  <Edit3 size={14} className="sm:w-4 sm:h-4" />
                </Button>
              )}
              
              {onUpdate && (
                <SimpleImageEditor
                  fileUrl={fileUrl}
                  fileName={fileName}
                  onUpdate={onUpdate}
                />
              )}
              
              <Button
                variant="secondary"
                size="sm"
                onClick={handleDownload}
                className="bg-white/90 hover:bg-white shadow-sm p-1 sm:p-2"
                title="Télécharger"
              >
                <Download size={14} className="sm:w-4 sm:h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {(isVideo || isYouTubeVideo) && (
        <div className="relative group max-w-xs sm:max-w-sm">
          <LessonVideoPlayer url={fileUrl} className="w-full rounded-lg" />
          <div className="mt-2 flex flex-col sm:flex-row gap-1 sm:gap-2">
            <Button variant="outline" size="sm" onClick={handleFullscreen} className="text-xs sm:text-sm">
              <Eye size={14} className="mr-1" />
              Plein écran
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload} className="text-xs sm:text-sm">
              <Download size={14} className="mr-1" />
              Télécharger
            </Button>
          </div>
        </div>
      )}

      {isAudio && (
        <ModernAudioPlayer
          fileUrl={fileUrl}
          fileName={fileName}
          className={className}
        />
      )}

      {isPDF && (
        <div className="bg-red-50 p-3 sm:p-4 rounded-lg max-w-xs sm:max-w-sm border border-red-200">
          <div className="flex items-center gap-2 mb-2 sm:mb-3">
            <div className="bg-red-500 p-1.5 sm:p-2 rounded-full text-white text-xs font-bold">
              PDF
            </div>
            <span className="font-medium text-xs sm:text-sm truncate">{fileName}</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-1 sm:gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => window.open(fileUrl, '_blank')}
              className="flex-1 text-xs sm:text-sm"
            >
              <Eye size={14} className="mr-1" />
              Ouvrir
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload} className="sm:w-auto">
              <Download size={14} />
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
