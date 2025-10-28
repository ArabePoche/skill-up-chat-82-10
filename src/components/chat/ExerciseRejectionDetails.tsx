/**
 * Composant pour afficher les détails d'un exercice rejeté
 * Affiche le message texte, l'audio vocal et les fichiers joints par le professeur
 */
import React, { useRef, useState } from 'react';
import { Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ExerciseFilePreview from '@/components/shared/ExerciseFilePreview';

interface ExerciseRejectionDetailsProps {
  rejectReason?: string;
  rejectAudioUrl?: string;
  rejectAudioDuration?: number;
  rejectFilesUrls?: string[];
}

const ExerciseRejectionDetails: React.FC<ExerciseRejectionDetailsProps> = ({
  rejectReason,
  rejectAudioUrl,
  rejectAudioDuration,
  rejectFilesUrls
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const playAudio = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const getFileTypeFromUrl = (url: string): string => {
    const extension = url.split('.').pop()?.toLowerCase() || '';
    
    // Images
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) {
      return `image/${extension === 'jpg' ? 'jpeg' : extension}`;
    }
    // Videos
    if (['mp4', 'webm', 'ogg', 'mov'].includes(extension)) {
      return `video/${extension}`;
    }
    // Audio
    if (['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(extension)) {
      return `audio/${extension}`;
    }
    // PDF
    if (extension === 'pdf') {
      return 'application/pdf';
    }
    // Documents
    if (['doc', 'docx'].includes(extension)) {
      return 'application/msword';
    }
    if (['xls', 'xlsx'].includes(extension)) {
      return 'application/vnd.ms-excel';
    }
    if (['ppt', 'pptx'].includes(extension)) {
      return 'application/vnd.ms-powerpoint';
    }
    
    // Par défaut
    return 'application/octet-stream';
  };

  if (!rejectReason && !rejectAudioUrl && (!rejectFilesUrls || rejectFilesUrls.length === 0)) {
    return null;
  }

  return (
    <div className="space-y-3 mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
      <div className="flex items-start space-x-2">
        <div className="w-1 h-full bg-red-500 rounded-full"></div>
        <div className="flex-1 space-y-3">
          {/* Message texte */}
          {rejectReason && (
            <div>
              <p className="text-xs font-semibold text-red-800 mb-1">Commentaire du professeur :</p>
              <p className="text-xs text-red-700 whitespace-pre-wrap">{rejectReason}</p>
            </div>
          )}

          {/* Message vocal */}
          {rejectAudioUrl && (
            <div>
              <p className="text-xs font-semibold text-red-800 mb-2">Message vocal :</p>
              <div className="flex items-center space-x-2 bg-white rounded-lg p-2 border border-red-200">
                <audio
                  ref={audioRef}
                  src={rejectAudioUrl}
                  onEnded={() => setIsPlaying(false)}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  className="hidden"
                />
                
                <Button
                  onClick={playAudio}
                  variant="ghost"
                  size="sm"
                  className="p-2 h-8 w-8 rounded-full hover:bg-red-100 flex-shrink-0"
                >
                  {isPlaying ? (
                    <Pause size={14} className="text-red-600" />
                  ) : (
                    <Play size={14} className="text-red-600" />
                  )}
                </Button>
                
                <div className="flex-1 flex items-center justify-center">
                  <span className="text-xs text-red-600 font-mono">
                    {rejectAudioDuration ? formatTime(rejectAudioDuration) : '0:00'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Fichiers joints avec prévisualisation */}
          {rejectFilesUrls && rejectFilesUrls.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-red-800 mb-2">Fichiers d'aide :</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {rejectFilesUrls.map((fileUrl, index) => (
                  <ExerciseFilePreview
                    key={index}
                    file={{
                      file_url: fileUrl,
                      file_type: getFileTypeFromUrl(fileUrl)
                    }}
                    showDownload={true}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExerciseRejectionDetails;
