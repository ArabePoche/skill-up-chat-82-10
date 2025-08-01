import React, { useState, useRef, useEffect } from 'react';
import { Mic, Send, X, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VoiceBarProps {
  onSendVoice: (file: File) => void;
  onCancel: () => void;
  disabled?: boolean;
}

const VoiceBar: React.FC<VoiceBarProps> = ({ 
  onSendVoice, 
  onCancel, 
  disabled = false 
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      console.log('🎤 Tentative d\'accès au microphone...');
      
      // Vérifier d'abord si l'API est disponible
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('L\'enregistrement audio n\'est pas supporté par votre navigateur');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      console.log('✅ Accès microphone autorisé, démarrage enregistrement');

      // Vérifier si MediaRecorder est supporté avec le format souhaité
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/mp4';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = '';
          }
        }
      }

      console.log('🎧 Format audio utilisé:', mimeType);

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
          console.log('📊 Chunk audio reçu:', event.data.size, 'bytes');
        }
      };

      mediaRecorder.onstop = () => {
        console.log('⏹️ Enregistrement arrêté, création du blob');
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
        console.log('💾 Blob créé:', blob.size, 'bytes, type:', blob.type);
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        
        // Créer un audio temporaire pour obtenir la durée
        const tempAudio = new Audio(url);
        tempAudio.onloadedmetadata = () => {
          console.log('⏱️ Durée audio:', tempAudio.duration, 'secondes');
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
      console.error('❌ Erreur accès microphone:', error);
      
      let errorMessage = 'Impossible d\'accéder au microphone.';
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = 'Accès au microphone refusé. Veuillez autoriser l\'accès dans les paramètres de votre navigateur.';
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'Aucun microphone détecté. Vérifiez qu\'un microphone est connecté.';
        } else if (error.message.includes('getUserMedia')) {
          errorMessage = 'Votre navigateur ne supporte pas l\'enregistrement audio.';
        }
      }
      
      alert(errorMessage);
      onCancel();
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

  const togglePlayback = () => {
    if (!audioRef.current || !audioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const sendRecording = () => {
    if (audioBlob) {
      const file = new File([audioBlob], `vocal_${Date.now()}.webm`, { type: 'audio/webm' });
      onSendVoice(file);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const displayTime = audioBlob ? formatTime(Math.floor(audioDuration)) : formatTime(recordingTime);

  return (
    <div className="bg-background border-t border-border p-3 fixed bottom-16 left-0 right-0 md:relative md:bottom-0 z-50">
      <div className="flex items-center justify-between bg-muted rounded-full px-4 py-3 border border-border shadow-sm">
        {/* Bouton Annuler */}
        <Button
          onClick={onCancel}
          variant="ghost"
          size="sm"
          className="h-10 w-10 rounded-full hover:bg-destructive/10 text-destructive hover:text-destructive flex-shrink-0"
        >
          <X size={18} />
        </Button>

        {/* Zone centrale avec micro/lecture et timer */}
        <div className="flex-1 flex items-center justify-center space-x-3 mx-4">
          {/* État initial - bouton pour démarrer */}
          {!isRecording && !audioBlob && (
            <Button
              onClick={startRecording}
              variant="ghost"
              size="sm"
              className="flex items-center space-x-2 hover:bg-primary/10 text-primary"
            >
              <Mic size={18} />
              <span className="text-sm font-medium">Appuyez pour enregistrer</span>
            </Button>
          )}

          {/* Indicateur d'enregistrement */}
          {isRecording && (
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 bg-destructive rounded-full animate-pulse flex-shrink-0"></div>
              <Mic size={18} className="text-destructive animate-pulse" />
              <span className="text-base font-medium text-destructive font-mono">
                {displayTime}
              </span>
            </div>
          )}

          {/* Contrôles de lecture */}
          {audioBlob && !isRecording && (
            <div className="flex items-center space-x-3">
              <Button
                onClick={togglePlayback}
                variant="ghost"
                size="sm"
                className="h-8 w-8 rounded-full hover:bg-primary/10 flex-shrink-0"
              >
                {isPlaying ? (
                  <Pause size={16} className="text-primary" />
                ) : (
                  <Play size={16} className="text-primary" />
                )}
              </Button>
              <span className="text-base font-medium text-foreground font-mono">
                {displayTime}
              </span>
            </div>
          )}
        </div>

        {/* Boutons d'action */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          {/* Bouton Arrêter l'enregistrement */}
          {isRecording && (
            <Button
              onClick={stopRecording}
              className="bg-orange-500 hover:bg-orange-600 h-10 w-16 rounded-full text-sm font-medium text-white"
              size="sm"
            >
              Stop
            </Button>
          )}

          {/* Bouton Envoyer (uniquement si on a un enregistrement) */}
          {audioBlob && (
            <Button
              onClick={sendRecording}
              disabled={disabled}
              className="bg-primary hover:bg-primary/90 h-10 w-10 rounded-full flex-shrink-0"
              size="sm"
            >
              <Send size={16} className="text-primary-foreground" />
            </Button>
          )}
        </div>
      </div>

      {/* Audio element caché pour la lecture */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />
      )}
    </div>
  );
};

export default VoiceBar;