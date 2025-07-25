
import React from 'react';
import { FileText, Image, Video, Volume2, Download } from 'lucide-react';

interface FilePreviewBadgeProps {
  fileName: string;
  fileType?: string;
  isNew?: boolean;
  context?: 'shared' | 'submitted' | 'annotated';
}

const FilePreviewBadge: React.FC<FilePreviewBadgeProps> = ({
  fileName,
  fileType,
  isNew = false,
  context = 'shared'
}) => {
  const getIcon = () => {
    if (fileType?.startsWith('image/')) return <Image size={16} />;
    if (fileType?.startsWith('video/')) return <Video size={16} />;
    if (fileType?.startsWith('audio/')) return <Volume2 size={16} />;
    return <FileText size={16} />;
  };

  const getBadgeText = () => {
    switch (context) {
      case 'shared': return 'Fichier partagé';
      case 'submitted': return 'Exercice soumis';
      case 'annotated': return 'Image annotée';
      default: return 'Fichier';
    }
  };

  const getBadgeColor = () => {
    switch (context) {
      case 'shared': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'submitted': return 'bg-green-100 text-green-700 border-green-200';
      case 'annotated': return 'bg-purple-100 text-purple-700 border-purple-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="flex items-center gap-2 text-xs">
      <div className={`flex items-center gap-1 px-2 py-1 rounded border ${getBadgeColor()}`}>
        {getIcon()}
        <span>{getBadgeText()}</span>
      </div>
      {isNew && (
        <span className="bg-red-500 text-white px-1 py-0.5 rounded text-xs font-bold">
          Nouveau
        </span>
      )}
    </div>
  );
};

export default FilePreviewBadge;
