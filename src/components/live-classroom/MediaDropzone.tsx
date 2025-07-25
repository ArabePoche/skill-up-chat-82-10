// Zone de gestion des soumissions de médias des élèves
import React from 'react';
import { Check, X, FileText, Image, Eye, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StudentSubmission } from './hooks/useSubmissionQueue';

interface MediaDropzoneProps {
  submissions: StudentSubmission[];
  onAccept: (submissionId: string) => void;
  onReject: (submissionId: string) => void;
}

const MediaDropzone: React.FC<MediaDropzoneProps> = ({
  submissions,
  onAccept,
  onReject
}) => {
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <Image size={16} className="text-blue-400" />;
    }
    return <FileText size={16} className="text-red-400" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `Il y a ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    return `Il y a ${hours}h${minutes % 60}min`;
  };

  if (submissions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <div className="text-4xl mb-2">📁</div>
        <div className="text-sm">Aucune soumission en attente</div>
        <div className="text-xs mt-1">Les fichiers des élèves apparaîtront ici</div>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-80 overflow-y-auto">
      {submissions.map((submission) => (
        <Card key={submission.id} className="bg-gray-700 border-gray-600">
          <CardContent className="p-3">
            {/* En-tête avec info étudiant */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs text-white font-bold">
                  {submission.studentName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-medium text-white">
                    {submission.studentName}
                  </div>
                  <div className="text-xs text-gray-400">
                    {formatTimeAgo(submission.submittedAt)}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onAccept(submission.id)}
                  className="p-1 text-green-400 hover:text-green-300 hover:bg-green-900/30"
                  title="Accepter et afficher"
                >
                  <Check size={14} />
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onReject(submission.id)}
                  className="p-1 text-red-400 hover:text-red-300 hover:bg-red-900/30"
                  title="Rejeter"
                >
                  <X size={14} />
                </Button>
              </div>
            </div>

            {/* Informations du fichier */}
            <div className="flex items-center space-x-2 mb-2">
              {getFileIcon(submission.fileType)}
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white truncate">
                  {submission.fileName}
                </div>
                <div className="text-xs text-gray-400">
                  {submission.fileType} • {formatFileSize(0)}
                </div>
              </div>
            </div>

            {/* Aperçu si c'est une image */}
            {submission.fileType.startsWith('image/') && (
              <div className="mt-2">
                <img
                  src={submission.fileUrl}
                  alt={submission.fileName}
                  className="w-full h-20 object-cover rounded border border-gray-600"
                />
              </div>
            )}

            {/* Actions supplémentaires */}
            <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-600">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-gray-400 hover:text-gray-300"
                onClick={() => window.open(submission.fileUrl, '_blank')}
              >
                <Eye size={12} className="mr-1" />
                Aperçu
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-gray-400 hover:text-gray-300"
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = submission.fileUrl;
                  link.download = submission.fileName;
                  link.click();
                }}
              >
                <Download size={12} className="mr-1" />
                Télécharger
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default MediaDropzone;