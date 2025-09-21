import React, { useState } from 'react';
import { Download, FileText, Image, Video, Music, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ImageModal } from '@/components/ui/image-modal';

interface ExerciseFile {
  id?: string;
  file_url: string;
  file_type: string;
}

interface ExerciseFilePreviewProps {
  file: ExerciseFile;
  showDownload?: boolean;
}

const ExerciseFilePreview: React.FC<ExerciseFilePreviewProps> = ({ 
  file, 
  showDownload = true 
}) => {
  const [showImageModal, setShowImageModal] = useState(false);
  const fileName = file.file_url.split('/').pop() || 'Fichier';
  
  const handleFileDownload = (fileUrl: string) => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image size={14} className="text-primary" />;
    if (fileType.startsWith('video/')) return <Video size={14} className="text-destructive" />;
    if (fileType.startsWith('audio/')) return <Music size={14} className="text-purple-500" />;
    if (fileType === 'application/pdf') return <FileText size={14} className="text-destructive" />;
    return <FileText size={14} className="text-muted-foreground" />;
  };

  // Image preview
  if (file.file_type.startsWith('image/')) {
    return (
      <>
        <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
          <div className="relative group cursor-pointer" onClick={() => setShowImageModal(true)}>
            <img 
              src={file.file_url} 
              alt={fileName}
              className="w-full h-40 object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <Button
                variant="secondary"
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
              >
                <Eye size={16} className="mr-1" />
                Voir
              </Button>
            </div>
          </div>
          <div className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                {getFileIcon(file.file_type)}
                <span className="text-sm font-medium text-foreground truncate">{fileName}</span>
              </div>
              {showDownload && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFileDownload(file.file_url);
                  }}
                  className="p-1 h-7 w-7 flex-shrink-0"
                >
                  <Download size={14} />
                </Button>
              )}
            </div>
          </div>
        </div>
        <ImageModal
          isOpen={showImageModal}
          onClose={() => setShowImageModal(false)}
          imageUrl={file.file_url}
          fileName={fileName}
        />
      </>
    );
  }

  // Video preview
  if (file.file_type.startsWith('video/')) {
    return (
      <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
        <video 
          src={file.file_url} 
          className="w-full h-40 object-cover"
          controls
          preload="metadata"
        />
        <div className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              {getFileIcon(file.file_type)}
              <span className="text-sm font-medium text-foreground truncate">{fileName}</span>
            </div>
            {showDownload && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleFileDownload(file.file_url)}
                className="p-1 h-7 w-7 flex-shrink-0"
              >
                <Download size={14} />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Audio preview
  if (file.file_type.startsWith('audio/')) {
    return (
      <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
        <div className="relative group bg-muted h-32 flex items-center justify-center">
          <div className="text-center">
            <Music size={40} className="text-purple-500 mb-2 mx-auto" />
            <p className="text-sm font-medium text-foreground">Fichier Audio</p>
            <p className="text-xs text-muted-foreground truncate max-w-[120px]">{fileName}</p>
          </div>
        </div>
        <div className="p-3">
          <audio 
            src={file.file_url} 
            controls
            preload="metadata"
            className="w-full mb-3"
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              {getFileIcon(file.file_type)}
              <span className="text-sm font-medium text-foreground truncate">{fileName}</span>
            </div>
            {showDownload && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleFileDownload(file.file_url)}
                className="p-1 h-7 w-7 flex-shrink-0"
              >
                <Download size={14} />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // PDF preview
  if (file.file_type === 'application/pdf') {
    return (
      <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        <div className="relative group bg-muted h-40 flex items-center justify-center">
          <div className="text-center">
            <FileText size={40} className="text-destructive mb-2 mx-auto" />
            <p className="text-sm font-medium text-foreground">Document PDF</p>
            <p className="text-xs text-muted-foreground truncate max-w-[120px]">{fileName}</p>
          </div>
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                window.open(file.file_url, '_blank');
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Eye size={16} className="mr-1" />
              Ouvrir le PDF
            </Button>
          </div>
        </div>
        <div className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              {getFileIcon(file.file_type)}
              <span className="text-sm font-medium text-foreground truncate">{fileName}</span>
            </div>
            {showDownload && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleFileDownload(file.file_url)}
                className="p-1 h-7 w-7 flex-shrink-0"
              >
                <Download size={14} />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Default file preview
  return (
    <div className="bg-card border border-border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          {getFileIcon(file.file_type)}
          <div className="min-w-0 flex-1">
            <a 
              href={file.file_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm font-medium text-primary hover:underline truncate block"
            >
              {fileName}
            </a>
            <p className="text-xs text-muted-foreground">
              {file.file_type.split('/')[1]?.toUpperCase() || 'Fichier'}
            </p>
          </div>
        </div>
        {showDownload && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleFileDownload(file.file_url)}
            className="p-2 h-8 w-8 flex-shrink-0"
          >
            <Download size={14} />
          </Button>
        )}
      </div>
    </div>
  );
};

export default ExerciseFilePreview;