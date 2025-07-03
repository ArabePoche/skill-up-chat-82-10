
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
      <div className="flex items-center gap-2 bg-green-50 rounded-full px-3 py-2 border border-green-200">
        <audio
          ref={audioRef}
          src={audioUrl || undefined}
          className="hidden"
        />
        
        <div className="flex items-center gap-2 flex-1">
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
            <Mic size={14} className="text-white" />
          </div>
          <span className="text-sm font-medium text-green-700">
            {formatTime(recordingTime)}
          </span>
        </div>
        
        <Button
          onClick={resetRecording}
          variant="ghost"
          size="sm"
          className="p-1 h-8 w-8 rounded-full hover:bg-red-100"
        >
          <X size={14} className="text-red-500" />
        </Button>
        
        <Button
          onClick={sendRecording}
          className="bg-green-500 hover:bg-green-600 p-2 h-8 w-8 rounded-full"
          size="sm"
        >
          <Send size={14} className="text-white" />
        </Button>
      </div>
    );
  }

  // Bouton d'enregistrement
  return (
    <div className="flex items-center gap-2">
      {isRecording && (
        <div className="flex items-center gap-2 bg-red-50 rounded-full px-3 py-1">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-red-600 font-medium">
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
          rounded-full w-12 h-12 p-0 border-2 transition-all duration-200
          ${isRecording 
            ? 'bg-red-500 hover:bg-red-600 border-red-300 scale-110 shadow-lg animate-pulse' 
            : 'bg-green-500 hover:bg-green-600 border-green-300 hover:scale-105'
          }
        `}
        title={isRecording ? 'Relâchez pour arrêter' : 'Maintenez pour enregistrer'}
      >
        <Mic 
          size={20} 
          className={`text-white ${isRecording ? 'animate-pulse' : ''}`} 
        />
      </Button>
    </div>
  );
};

export default WhatsAppVoiceRecorder;
