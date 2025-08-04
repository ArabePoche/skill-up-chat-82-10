// Modal d'appel côté étudiant - "Appel en cours..."
import React, { useEffect, useState } from 'react';
import { PhoneOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface StudentCallModalProps {
  isOpen: boolean;
  onEndCall: () => void;
  callType: 'audio' | 'video';
  teacherName?: string;
}

const StudentCallModal: React.FC<StudentCallModalProps> = ({
  isOpen,
  onEndCall,
  callType,
  teacherName
}) => {
  const [callDuration, setCallDuration] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setCallDuration(0);
      return;
    }

    const interval = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-sm mx-auto bg-gradient-to-b from-primary/10 to-primary/5 border-primary/20">
        <DialogHeader>
          <DialogTitle className="text-center text-lg font-semibold">
            Appel {callType === 'video' ? 'vidéo' : 'audio'} en cours
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center space-y-6 py-6">
          {/* Icône d'appel animée */}
          <div className="relative">
            <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center animate-pulse">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
            <div className="absolute -inset-2 bg-primary/20 rounded-full animate-ping"></div>
          </div>

          {/* Message principal */}
          <div className="text-center space-y-2">
            <p className="text-lg font-medium">
              {teacherName ? `En attente de ${teacherName}` : 'Recherche d\'un professeur...'}
            </p>
            <p className="text-sm text-muted-foreground">
              Durée: {formatDuration(callDuration)}
            </p>
            <p className="text-xs text-muted-foreground">
              Votre appel va être transmis aux professeurs disponibles
            </p>
          </div>

          {/* Bouton arrêter */}
          <Button
            onClick={onEndCall}
            variant="destructive"
            size="lg"
            className="w-full"
          >
            <PhoneOff className="w-4 h-4 mr-2" />
            Arrêter l'appel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StudentCallModal;