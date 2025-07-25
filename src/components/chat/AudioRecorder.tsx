
import React, { useState, useRef } from 'react';
import { Mic, Square, Play, Pause, Trash2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AudioRecorderProps {
  onRecordingComplete: (file: File) => void;
  disabled?: boolean;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ onRecordingComplete, disabled = false }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);

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
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        
        // Créer un audio temporaire pour obtenir la durée réelle
        const tempAudio = new Audio(url);
        tempAudio.onloadedmetadata = () => {
          setAudioDuration(tempAudio.duration);
        };
        
        // Arrêter le stream
        stream.getTracks().forEach(track => track.stop());
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

  const playAudio = () => {
    if (!audioUrl || !audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const deleteRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setIsPlaying(false);
    setRecordingTime(0);
    setAudioDuration(0);
  };

  const sendRecording = () => {
    if (audioBlob) {
      const file = new File([audioBlob], `audio_${Date.now()}.webm`, { type: 'audio/webm' });
      onRecordingComplete(file);
      deleteRecording();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Si on a un enregistrement, afficher les contrôles de lecture
  if (audioBlob) {
    return (
      <div className="flex items-center justify-between space-x-1 sm:space-x-2 bg-gray-50 rounded-lg p-2 border border-gray-200 w-full max-w-[280px] sm:max-w-xs">
        <audio
          ref={audioRef}
          src={audioUrl || undefined}
          onEnded={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          className="hidden"
        />
        
        <Button
          onClick={playAudio}
          variant="ghost"
          size="sm"
          className="p-1 h-6 w-6 sm:h-8 sm:w-8 rounded-full hover:bg-green-100 flex-shrink-0"
        >
          {isPlaying ? (
            <Pause size={12} className="text-green-600 sm:w-[14px] sm:h-[14px]" />
          ) : (
            <Play size={12} className="text-green-600 sm:w-[14px] sm:h-[14px]" />
          )}
        </Button>
        
        <div className="flex-1 flex items-center justify-center">
          <span className="text-xs sm:text-sm text-gray-600 font-mono">
            {formatTime(Math.floor(audioDuration) || recordingTime)}
          </span>
        </div>
        
        <Button
          onClick={deleteRecording}
          variant="ghost"
          size="sm"
          className="p-1 h-6 w-6 sm:h-8 sm:w-8 rounded-full hover:bg-red-100 flex-shrink-0"
        >
          <Trash2 size={12} className="text-red-500 sm:w-[14px] sm:h-[14px]" />
        </Button>
        
        <Button
          onClick={sendRecording}
          variant="ghost"
          size="sm"
          className="p-1 h-6 w-6 sm:h-8 sm:w-8 rounded-full hover:bg-green-100 flex-shrink-0"
        >
          <Send size={12} className="text-green-600 sm:w-[14px] sm:h-[14px]" />
        </Button>
      </div>
    );
  }

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
      
      <Button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={disabled}
        variant="outline"
        size="sm"
        className={`p-2 h-8 w-8 sm:h-10 sm:w-10 rounded-full transition-all duration-200 flex-shrink-0 ${
          isRecording 
            ? 'bg-red-500 text-white hover:bg-red-600 border-red-300 scale-110 shadow-lg animate-pulse' 
            : 'hover:bg-gray-100 hover:scale-105'
        }`}
        title={isRecording ? 'Arrêter l\'enregistrement' : 'Enregistrer un message vocal'}
      >
        {isRecording ? (
          <Square size={12} className="sm:w-[14px] sm:h-[14px]" />
        ) : (
          <Mic size={12} className="sm:w-[14px] sm:h-[14px]" />
        )}
      </Button>
    </div>
  );
};

export default AudioRecorder;
