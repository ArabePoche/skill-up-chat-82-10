
import React, { useState, useRef, useEffect } from 'react';
import { Mic, Send, X, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ResponsiveVoiceRecorderProps {
  onRecordingComplete: (file: File) => void;
  disabled?: boolean;
}

const ResponsiveVoiceRecorder: React.FC<ResponsiveVoiceRecorderProps> = ({ 
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
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);

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

  // État d'enregistrement terminé - Responsive
  if (audioBlob && !isRecording) {
    return (
      <div className="flex items-center gap-2 bg-green-50 rounded-full px-2 sm:px-3 py-1 sm:py-2 border border-green-200 max-w-full">
        <audio
          src={audioUrl || undefined}
          className="hidden"
        />
        
        <div className="flex items-center gap-1 sm:gap-2 flex-1 min-w-0">
          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
            <Mic size={12} className="sm:w-[14px] sm:h-[14px] text-white" />
          </div>
          <span className="text-xs sm:text-sm font-medium text-green-700 truncate">
            {formatTime(recordingTime)}
          </span>
        </div>
        
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            onClick={resetRecording}
            variant="ghost"
            size="sm"
            className="p-1 h-6 w-6 sm:h-8 sm:w-8 rounded-full hover:bg-red-100"
          >
            <X size={12} className="sm:w-[14px] sm:h-[14px] text-red-500" />
          </Button>
          
          <Button
            onClick={sendRecording}
            className="bg-green-500 hover:bg-green-600 p-1 h-6 w-6 sm:h-8 sm:w-8 rounded-full"
            size="sm"
          >
            <Send size={12} className="sm:w-[14px] sm:h-[14px] text-white" />
          </Button>
        </div>
      </div>
    );
  }

  // Bouton d'enregistrement - Responsive
  return (
    <div className="flex items-center gap-1 sm:gap-2">
      {isRecording && (
        <div className="flex items-center gap-1 sm:gap-2 bg-red-50 rounded-full px-2 sm:px-3 py-1">
          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-red-500 rounded-full animate-pulse"></div>
          <span className="text-xs sm:text-sm text-red-600 font-medium">
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
          rounded-full border-2 transition-all duration-200 flex-shrink-0
          w-10 h-10 sm:w-12 sm:h-12 p-0
          ${isRecording 
            ? 'bg-red-500 hover:bg-red-600 border-red-300 scale-110 shadow-lg animate-pulse' 
            : 'bg-green-500 hover:bg-green-600 border-green-300 hover:scale-105'
          }
        `}
        title={isRecording ? 'Relâchez pour arrêter' : 'Maintenez pour enregistrer'}
      >
        {isRecording ? (
          <Square size={16} className="sm:w-[20px] sm:h-[20px] text-white" />
        ) : (
          <Mic size={16} className="sm:w-[20px] sm:h-[20px] text-white" />
        )}
      </Button>
    </div>
  );
};

export default ResponsiveVoiceRecorder;
