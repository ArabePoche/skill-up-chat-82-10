
import React, { useState, useRef } from 'react';
import { Mic, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AudioRecorderProps {
  onRecordingComplete: (file: File) => void;
  disabled?: boolean;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ onRecordingComplete, disabled = false }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Détection automatique du meilleur format audio supporté (mobile-first)
  const getSupportedMimeType = (): { mimeType: string; extension: string } => {
    const formats = [
      { mimeType: 'audio/mp4', extension: 'mp4' },           // iOS + Android
      { mimeType: 'audio/webm;codecs=opus', extension: 'webm' }, // Android Chrome
      { mimeType: 'audio/webm', extension: 'webm' },         // Fallback WebM
      { mimeType: 'audio/ogg;codecs=opus', extension: 'ogg' }, // Firefox
    ];

    for (const format of formats) {
      if (MediaRecorder.isTypeSupported(format.mimeType)) {
        console.log('🎧 Format audio détecté:', format.mimeType);
        return format;
      }
    }

    console.log('🎧 Aucun format préféré, utilisation du défaut');
    return { mimeType: '', extension: 'webm' };
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      const { mimeType, extension } = getSupportedMimeType();
      
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const actualMimeType = mediaRecorder.mimeType || 'audio/webm';

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: actualMimeType });
        
        // Déterminer l'extension à partir du mimeType réel
        const fileExt = actualMimeType.includes('mp4') ? 'mp4' 
          : actualMimeType.includes('ogg') ? 'ogg' 
          : 'webm';
        
        const file = new File([blob], `audio_${Date.now()}.${fileExt}`, { type: actualMimeType });
        onRecordingComplete(file);
        
        // Arrêter le stream
        stream.getTracks().forEach(track => track.stop());
        
        // Réinitialiser l'état
        setRecordingTime(0);
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);

      // Démarrer le timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Erreur accès microphone:', error);
      alert('Impossible d\'accéder au microphone. Vérifiez vos permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Bouton d'enregistrement
  return (
    <div className="flex items-center space-x-1 sm:space-x-2 relative">
      {isRecording && (
        <div className="absolute right-10 sm:right-12 top-1/2 transform -translate-y-1/2 bg-red-50 rounded-full px-2 py-1 border border-red-200 shadow-sm z-10">
          <span className="text-xs sm:text-sm text-red-600 animate-pulse font-mono whitespace-nowrap">
            {formatTime(recordingTime)}
          </span>
        </div>
      )}
      
      {!isRecording ? (
        <Button
          onClick={startRecording}
          disabled={disabled}
          variant="actionOrange"
          size="sm"
          className="gap-1.5 transition-all duration-200 flex-shrink-0 hover:scale-105"
          title="Enregistrer un message vocal"
        >
          <Mic size={16} />
          <span>Vocal</span>
        </Button>
      ) : (
        <Button
          onClick={stopRecording}
          className="bg-red-500 hover:bg-red-600 p-2 h-8 w-8 sm:h-10 sm:w-10 rounded-full transition-all duration-200 flex-shrink-0 scale-110 shadow-lg"
          title="Arrêter et envoyer"
        >
          <Pause size={12} className="text-white sm:w-[14px] sm:h-[14px]" />
        </Button>
      )}
    </div>
  );
};

export default AudioRecorder;
