
import React, { useState } from 'react';
import { Download, Eye, Maximize2, Edit3, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface MediaPreviewCoreProps {
  fileUrl: string;
  fileName: string;
  fileType?: string;
  onAnnotate?: () => void;
  canAnnotate?: boolean;
  onUpdate?: (newUrl: string) => void;
  showEditButton?: boolean;
}

const MediaPreviewCore: React.FC<MediaPreviewCoreProps> = ({
  fileUrl,
  fileName,
  fileType,
  onAnnotate,
  canAnnotate = false,
  onUpdate,
  showEditButton = true
}) => {
  const [showFullscreen, setShowFullscreen] = useState(false);

  const isImage = fileType?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(fileName);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    link.click();
  };

  if (!isImage) return null;

  return (
    <>
      <div className="relative group">
        <img
          src={fileUrl}
          alt={fileName}
          className="w-full max-w-xs sm:max-w-sm max-h-48 sm:max-h-64 object-contain rounded-lg"
          loading="lazy"
        />
        {/* Boutons d'action - TOUJOURS visibles maintenant */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200 rounded-lg flex items-center justify-center">
          <div className="flex gap-1 sm:gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowFullscreen(true)}
              className="bg-white/90 hover:bg-white shadow-sm p-1 sm:p-2"
              title="Voir en plein écran"
            >
              <Maximize2 size={14} className="sm:w-4 sm:h-4" />
            </Button>
            
            {/* Bouton d'annotation pour les enseignants */}
            {canAnnotate && onAnnotate && (
              <Button
                variant="secondary"
                size="sm"
                onClick={onAnnotate}
                className="bg-white/90 hover:bg-white shadow-sm p-1 sm:p-2"
                title="Annoter l'image"
              >
                <Edit3 size={14} className="sm:w-4 sm:h-4" />
              </Button>
            )}
            
            {/* Bouton d'édition - FORCÉ à être visible */}
            {showEditButton && onUpdate && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  // Simuler l'édition pour le moment
                  console.log('Edit button clicked for:', fileName);
                }}
                className="bg-blue-500/90 hover:bg-blue-600 text-white shadow-sm p-1 sm:p-2"
                title="Éditer l'image"
              >
                <Edit3 size={14} className="sm:w-4 sm:h-4" />
              </Button>
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

        {/* Boutons mobiles - visibles en permanence sur mobile */}
        <div className="absolute top-2 right-2 flex gap-1 sm:hidden">
          {showEditButton && onUpdate && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                console.log('Mobile edit button clicked for:', fileName);
              }}
              className="bg-blue-500/90 hover:bg-blue-600 text-white shadow-sm p-1"
              title="Éditer"
            >
              <Edit3 size={12} />
            </Button>
          )}
          
          {canAnnotate && onAnnotate && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onAnnotate}
              className="bg-white/90 hover:bg-white shadow-sm p-1"
              title="Annoter"
            >
              <Edit3 size={12} />
            </Button>
          )}
        </div>
      </div>

      {showFullscreen && (
        <Dialog open={true} onOpenChange={() => setShowFullscreen(false)}>
          <DialogContent className="max-w-[95vw] max-h-[95vh] p-2">
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 z-10 bg-black/50 text-white hover:bg-black/70"
                onClick={() => setShowFullscreen(false)}
              >
                <X size={16} />
              </Button>
              <img
                src={fileUrl}
                alt={fileName}
                className="max-w-full max-h-[90vh] object-contain mx-auto"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default MediaPreviewCore;
