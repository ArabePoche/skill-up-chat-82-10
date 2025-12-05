/**
 * FilePreviewBadge - Badge de prévisualisation de fichier avec icônes officielles
 * Utilise file-icon-vectors pour afficher les vraies icônes de Word, Excel, PDF, etc.
 */
import React from 'react';
import FileIcon from '@/components/ui/FileIcon';

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
      <div className={`flex items-center gap-1.5 px-2 py-1 rounded border ${getBadgeColor()}`}>
        <FileIcon fileName={fileName} fileType={fileType} size="sm" />
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
