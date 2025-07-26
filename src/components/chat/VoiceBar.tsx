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
    console.log('🎤 VoiceBar monté, démarrage automatique de l\'enregistrement');
    startRecording();
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      console.log('🎤 Tentative d\'accès au microphone...');
      
      // Vérifier d'abord si l'API est disponible
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('API getUserMedia non supportée');
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
      alert('Impossible d\'accéder au microphone. Vérifiez vos permissions dans les paramètres du navigateur.');
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
    <div className="bg-[#f0f0f0] border-t border-gray-200 p-2 sm:p-3 fixed bottom-16 left-0 right-0 md:relative md:bottom-0 z-50">
      <div className="flex items-center justify-between bg-green-50 rounded-full px-3 sm:px-4 py-2 border border-green-200">
        {/* Bouton Annuler */}
        <Button
          onClick={onCancel}
          variant="ghost"
          size="sm"
          className="p-2 h-8 w-8 sm:h-10 sm:w-10 rounded-full hover:bg-red-100 text-red-500 hover:text-red-600 flex-shrink-0"
        >
          <X size={16} className="sm:w-[18px] sm:h-[18px]" />
        </Button>

        {/* Zone centrale avec micro/lecture et timer */}
        <div className="flex-1 flex items-center justify-center space-x-2 sm:space-x-3 mx-2 sm:mx-4">
          {/* Indicateur d'enregistrement ou bouton lecture */}
          {isRecording ? (
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-red-500 rounded-full animate-pulse flex-shrink-0"></div>
              <Mic size={16} className="text-red-500 sm:w-[18px] sm:h-[18px] animate-pulse" />
            </div>
          ) : audioBlob ? (
            <Button
              onClick={togglePlayback}
              variant="ghost"
              size="sm"
              className="p-1 h-6 w-6 sm:h-8 sm:w-8 rounded-full hover:bg-green-200 flex-shrink-0"
            >
              {isPlaying ? (
                <Pause size={14} className="text-green-600 sm:w-[16px] sm:h-[16px]" />
              ) : (
                <Play size={14} className="text-green-600 sm:w-[16px] sm:h-[16px]" />
              )}
            </Button>
          ) : null}

          {/* Timer */}
          <span className="text-sm sm:text-base font-medium text-green-700 font-mono whitespace-nowrap">
            {displayTime}
          </span>
        </div>

        {/* Boutons d'action */}
        <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
          {/* Bouton Arrêter l'enregistrement */}
          {isRecording && (
            <Button
              onClick={stopRecording}
              className="bg-orange-500 hover:bg-orange-600 p-2 h-8 w-8 sm:h-10 sm:w-10 rounded-full text-xs sm:text-sm font-medium"
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
              className="bg-green-500 hover:bg-green-600 p-2 h-8 w-8 sm:h-10 sm:w-10 rounded-full flex-shrink-0"
              size="sm"
            >
              <Send size={14} className="text-white sm:w-[16px] sm:h-[16px]" />
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