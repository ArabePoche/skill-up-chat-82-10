/**
 * Composant pour afficher les détails d'un exercice rejeté
 * Affiche le message texte, l'audio vocal et les fichiers joints par le professeur
 */
import React, { useRef, useState } from 'react';
import { Play, Pause, Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

  const getFileName = (url: string) => {
    const parts = url.split('/');
    return parts[parts.length - 1] || 'fichier';
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

          {/* Fichiers joints */}
          {rejectFilesUrls && rejectFilesUrls.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-red-800 mb-2">Fichiers d'aide :</p>
              <div className="space-y-2">
                {rejectFilesUrls.map((fileUrl, index) => (
                  <div key={index} className="flex items-center justify-between bg-white rounded p-2 border border-red-200">
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <FileText size={14} className="text-red-600 flex-shrink-0" />
                      <span className="text-xs text-red-700 truncate">
                        {getFileName(fileUrl)}
                      </span>
                    </div>
                    <a
                      href={fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-2 h-7 w-7 rounded hover:bg-red-100"
                      >
                        <Download size={12} className="text-red-600" />
                      </Button>
                    </a>
                  </div>
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
