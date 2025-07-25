
import React, { useState, useRef, useEffect } from 'react';
import { Mic, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WhatsAppVoiceRecorderProps {
  onRecordingComplete: (file: File) => void;
  disabled?: boolean;
}

const WhatsAppVoiceRecorder: React.FC<WhatsAppVoiceRecorderProps> = ({ 
  onRecordingComplete, 
  disabled = false 
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        
        // Stop stream
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
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

  const sendRecording = () => {
    if (audioBlob) {
      const file = new File([audioBlob], `vocal_${Date.now()}.webm`, { type: 'audio/webm' });
      onRecordingComplete(file);
      resetRecording();
    }
  };

  const resetRecording = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Si on a un enregistrement terminé
  if (audioBlob && !isRecording) {
    return (
      <div className="flex items-center gap-1 sm:gap-2 bg-green-50 rounded-full px-2 sm:px-3 py-1 sm:py-2 border border-green-200 max-w-full overflow-hidden">
        <audio
          ref={audioRef}
          src={audioUrl || undefined}
          className="hidden"
        />
        
        <div className="flex items-center gap-1 sm:gap-2 flex-1 min-w-0">
          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
            <Mic size={12} className="text-white sm:w-[14px] sm:h-[14px]" />
          </div>
          <span className="text-xs sm:text-sm font-medium text-green-700 truncate">
            {formatTime(recordingTime)}
          </span>
        </div>
        
        <Button
          onClick={resetRecording}
          variant="ghost"
          size="sm"
          className="p-1 h-6 w-6 sm:h-8 sm:w-8 rounded-full hover:bg-red-100 flex-shrink-0"
        >
          <X size={12} className="text-red-500 sm:w-[14px] sm:h-[14px]" />
        </Button>
        
        <Button
          onClick={sendRecording}
          className="bg-green-500 hover:bg-green-600 p-1 sm:p-2 h-6 w-6 sm:h-8 sm:w-8 rounded-full flex-shrink-0"
          size="sm"
        >
          <Send size={12} className="text-white sm:w-[14px] sm:h-[14px]" />
        </Button>
      </div>
    );
  }

  // Bouton d'enregistrement
  return (
    <div className="flex items-center gap-1 sm:gap-2 relative">
      {isRecording && (
        <div className="flex items-center gap-1 sm:gap-2 bg-red-50 rounded-full px-2 sm:px-3 py-1 absolute right-12 sm:right-14 top-1/2 transform -translate-y-1/2 z-10 shadow-md border border-red-200">
          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-red-500 rounded-full animate-pulse flex-shrink-0"></div>
          <span className="text-xs sm:text-sm text-red-600 font-medium whitespace-nowrap">
            {formatTime(recordingTime)}
          </span>
        </div>
      )}
      
      <Button
        onMouseDown={startRecording}
        onMouseUp={stopRecording}
        onTouchStart={startRecording}
        onTouchEnd={stopRecording}
        disabled={disabled}
        className={`
          rounded-full w-10 h-10 sm:w-12 sm:h-12 p-0 border-2 transition-all duration-200 flex-shrink-0
          ${isRecording 
            ? 'bg-red-500 hover:bg-red-600 border-red-300 scale-110 shadow-lg animate-pulse' 
            : 'bg-green-500 hover:bg-green-600 border-green-300 hover:scale-105'
          }
        `}
        title={isRecording ? 'Relâchez pour arrêter' : 'Maintenez pour enregistrer'}
      >
        <Mic 
          size={16} 
          className={`text-white ${isRecording ? 'animate-pulse' : ''} sm:w-[20px] sm:h-[20px]`} 
        />
      </Button>
    </div>
  );
};

export default WhatsAppVoiceRecorder;
