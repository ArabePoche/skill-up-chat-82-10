// Modal d'appel côté professeur avec sonnerie
import React, { useEffect, useState, useRef } from 'react';
import { Phone, PhoneOff, Video, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';

interface TeacherCallModalProps {
  isOpen: boolean;
  onAccept: () => void;
  onReject: () => void;
  studentName: string;
  studentAvatar?: string;
  callType: 'audio' | 'video';
  formationTitle?: string;
  lessonTitle?: string;
}

const TeacherCallModal: React.FC<TeacherCallModalProps> = ({
  isOpen,
  onAccept,
  onReject,
  studentName,
  studentAvatar,
  callType,
  formationTitle,
  lessonTitle
}) => {
  const [isRinging, setIsRinging] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsRinging(true);
      // Créer et jouer la sonnerie
      if (!audioRef.current) {
        audioRef.current = new Audio();
        audioRef.current.loop = true;
        audioRef.current.volume = 0.5;
        
        // Créer une sonnerie simple avec l'API Web Audio
        createRingtone().then(audioUrl => {
          if (audioRef.current) {
            audioRef.current.src = audioUrl;
            audioRef.current.play().catch(console.error);
          }
        });
      }
    } else {
      setIsRinging(false);
      // Arrêter la sonnerie
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [isOpen]);

  const createRingtone = async (): Promise<string> => {
    try {
      const audioContext = new AudioContext();
      const duration = 2; // 2 secondes
      const sampleRate = audioContext.sampleRate;
      const buffer = audioContext.createBuffer(1, duration * sampleRate, sampleRate);
      const data = buffer.getChannelData(0);

      // Générer une sonnerie simple (fréquences 440Hz et 880Hz)
      for (let i = 0; i < buffer.length; i++) {
        const time = i / sampleRate;
        const frequency1 = 440; // La
        const frequency2 = 880; // La (octave supérieure)
        
        // Créer un motif de sonnerie
        const envelope = Math.sin(time * Math.PI * 2) * 0.5; // Modulation d'amplitude
        const tone1 = Math.sin(time * frequency1 * Math.PI * 2) * 0.3;
        const tone2 = Math.sin(time * frequency2 * Math.PI * 2) * 0.2;
        
        data[i] = (tone1 + tone2) * envelope * 0.5;
      }

      // Convertir en blob et créer une URL
      const offlineContext = new OfflineAudioContext(1, buffer.length, sampleRate);
      const source = offlineContext.createBufferSource();
      source.buffer = buffer;
      source.connect(offlineContext.destination);
      source.start();
      
      const renderedBuffer = await offlineContext.startRendering();
      const audioBlob = await bufferToWave(renderedBuffer);
      return URL.createObjectURL(audioBlob);
    } catch (error) {
      console.error('Erreur création sonnerie:', error);
      return '';
    }
  };

  const bufferToWave = (audioBuffer: AudioBuffer): Promise<Blob> => {
    return new Promise((resolve) => {
      const length = audioBuffer.length;
      const arrayBuffer = new ArrayBuffer(44 + length * 2);
      const view = new DataView(arrayBuffer);

      // En-tête WAV
      const writeString = (offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
          view.setUint8(offset + i, string.charCodeAt(i));
        }
      };

      writeString(0, 'RIFF');
      view.setUint32(4, 36 + length * 2, true);
      writeString(8, 'WAVE');
      writeString(12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, 1, true);
      view.setUint32(24, audioBuffer.sampleRate, true);
      view.setUint32(28, audioBuffer.sampleRate * 2, true);
      view.setUint16(32, 2, true);
      view.setUint16(34, 16, true);
      writeString(36, 'data');
      view.setUint32(40, length * 2, true);

      // Données audio
      const data = audioBuffer.getChannelData(0);
      let offset = 44;
      for (let i = 0; i < length; i++) {
        const sample = Math.max(-1, Math.min(1, data[i]));
        view.setInt16(offset, sample * 0x7FFF, true);
        offset += 2;
      }

      resolve(new Blob([arrayBuffer], { type: 'audio/wav' }));
    });
  };

  const handleAccept = () => {
    setIsRinging(false);
    if (audioRef.current) {
      audioRef.current.pause();
    }
    onAccept();
  };

  const handleReject = () => {
    setIsRinging(false);
    if (audioRef.current) {
      audioRef.current.pause();
    }
    onReject();
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-md mx-auto bg-gradient-to-b from-blue-50 to-white border-blue-200">
        <div className="flex flex-col items-center space-y-6 py-6">
          {/* Avatar étudiant avec animation */}
          <div className="relative">
            <Avatar className={`w-24 h-24 ${isRinging ? 'animate-pulse' : ''}`}>
              <AvatarImage src={studentAvatar} alt={studentName} />
              <AvatarFallback className="bg-blue-500 text-white text-2xl">
                {studentName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {isRinging && (
              <div className="absolute -inset-2 bg-blue-400/20 rounded-full animate-ping"></div>
            )}
          </div>

          {/* Informations de l'appel */}
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">
              {studentName}
            </h2>
            <p className="text-sm text-gray-600 flex items-center justify-center gap-2">
              {callType === 'video' ? (
                <Video className="w-4 h-4" />
              ) : (
                <Phone className="w-4 h-4" />
              )}
              Appel {callType === 'video' ? 'vidéo' : 'audio'} entrant
            </p>
            {formationTitle && (
              <p className="text-xs text-gray-500">
                Formation: {formationTitle}
              </p>
            )}
            {lessonTitle && (
              <p className="text-xs text-gray-500">
                Leçon: {lessonTitle}
              </p>
            )}
          </div>

          {/* Boutons d'action */}
          <div className="flex gap-6">
            <Button
              onClick={handleReject}
              variant="destructive"
              size="lg"
              className="w-16 h-16 rounded-full"
            >
              <PhoneOff className="w-6 h-6" />
            </Button>
            
            <Button
              onClick={handleAccept}
              className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600"
            >
              <Phone className="w-6 h-6" />
            </Button>
          </div>

          <p className="text-xs text-gray-400 text-center">
            {isRinging ? '🔔 Sonnerie...' : ''}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TeacherCallModal;