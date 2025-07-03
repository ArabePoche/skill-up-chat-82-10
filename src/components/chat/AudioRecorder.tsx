
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
        setAudioUrl(URL.createObjectURL(blob));
        
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
    setAudioBlob(null);
    setAudioUrl(null);
    setIsPlaying(false);
    setRecordingTime(0);
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
      <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-2">
        <audio
          ref={audioRef}
          src={audioUrl || undefined}
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />
        
        <Button
          onClick={playAudio}
          variant="outline"
          size="sm"
          className="p-2"
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </Button>
        
        <span className="text-sm text-gray-600 min-w-[40px]">
          {formatTime(recordingTime)}
        </span>
        
        <Button
          onClick={deleteRecording}
          variant="outline"
          size="sm"
          className="p-2 text-red-500 hover:text-red-700"
        >
          <Trash2 size={16} />
        </Button>
        
        <Button
          onClick={sendRecording}
          variant="outline"
          size="sm"
          className="p-2 text-green-500 hover:text-green-700"
        >
          <Send size={16} />
        </Button>
      </div>
    );
  }

  // Bouton d'enregistrement
  return (
    <div className="flex items-center space-x-2">
      {isRecording && (
        <span className="text-sm text-red-500 animate-pulse min-w-[40px]">
          {formatTime(recordingTime)}
        </span>
      )}
      
      <Button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={disabled}
        variant="outline"
        size="sm"
        className={`p-2 ${isRecording ? 'bg-red-500 text-white hover:bg-red-600' : ''}`}
        title={isRecording ? 'Arrêter l\'enregistrement' : 'Enregistrer un message vocal'}
      >
        {isRecording ? <Square size={16} /> : <Mic size={16} />}
      </Button>
    </div>
  );
};

export default AudioRecorder;
