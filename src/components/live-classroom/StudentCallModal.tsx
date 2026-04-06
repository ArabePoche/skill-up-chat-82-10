// Modal d'appel côté étudiant - avec feedback de statut (accepté/rejeté/en attente)
import React, { useEffect, useState } from 'react';
import { PhoneOff, Loader2, CheckCircle2, XCircle, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotificationSoundService } from '@/services/NotificationSoundService';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export type CallStatus = 'pending' | 'accepted' | 'rejected' | 'ended' | 'active';

interface StudentCallModalProps {
  isOpen: boolean;
  onEndCall: () => void;
  callType: 'audio' | 'video';
  teacherName?: string;
  callStatus?: CallStatus;
}

const StudentCallModal: React.FC<StudentCallModalProps> = ({
  isOpen,
  onEndCall,
  callType,
  teacherName,
  callStatus = 'pending'
}) => {
  const [callDuration, setCallDuration] = useState(0);
  const [autoCloseTimer, setAutoCloseTimer] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setCallDuration(0);
      NotificationSoundService.stopCallingTone();
      return;
    }

    if (callStatus === 'pending') {
      NotificationSoundService.startCallingTone();
    } else {
      NotificationSoundService.stopCallingTone();
    }

    const interval = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);

    return () => {
      clearInterval(interval);
      NotificationSoundService.stopCallingTone();
    };
  }, [isOpen, callStatus]);

  // Auto-fermer après un délai quand accepté ou rejeté
  useEffect(() => {
    if (callStatus === 'accepted' || callStatus === 'rejected') {
      const timer = window.setTimeout(() => {
        onEndCall();
      }, 4000);
      setAutoCloseTimer(timer as unknown as number);
      return () => window.clearTimeout(timer);
    }
  }, [callStatus, onEndCall]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const renderStatusContent = () => {
    switch (callStatus) {
      case 'accepted':
        return (
          <div className="flex flex-col items-center space-y-4">
            <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center animate-bounce">
              <CheckCircle2 className="w-10 h-10 text-primary-foreground" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-lg font-semibold text-primary">Appel accepté !</p>
              <p className="text-sm text-muted-foreground">
                Un professeur a accepté votre appel. Connexion en cours...
              </p>
            </div>
          </div>
        );

      case 'rejected':
        return (
          <div className="flex flex-col items-center space-y-4">
            <div className="w-20 h-20 bg-destructive rounded-full flex items-center justify-center">
              <XCircle className="w-10 h-10 text-white" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-lg font-semibold text-destructive">Appel refusé</p>
              <p className="text-sm text-muted-foreground">
                Le professeur n'est pas disponible pour le moment. Réessayez plus tard.
              </p>
            </div>
            <Button onClick={onEndCall} variant="outline" size="lg" className="w-full">
              Fermer
            </Button>
          </div>
        );

      case 'ended':
        return (
          <div className="flex flex-col items-center space-y-4">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center">
              <Phone className="w-10 h-10 text-muted-foreground" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-lg font-semibold">Appel terminé</p>
              <p className="text-sm text-muted-foreground">
                Durée: {formatDuration(callDuration)}
              </p>
            </div>
            <Button onClick={onEndCall} variant="outline" size="lg" className="w-full">
              Fermer
            </Button>
          </div>
        );

      default: // pending
        return (
          <div className="flex flex-col items-center space-y-6">
            <div className="relative">
              <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center animate-pulse">
                <Loader2 className="w-8 h-8 text-primary-foreground animate-spin" />
              </div>
              <div className="absolute -inset-2 bg-primary/20 rounded-full animate-ping"></div>
            </div>
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
            <Button onClick={onEndCall} variant="destructive" size="lg" className="w-full">
              <PhoneOff className="w-4 h-4 mr-2" />
              Arrêter l'appel
            </Button>
          </div>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-sm mx-auto bg-gradient-to-b from-primary/10 to-primary/5 border-primary/20">
        <DialogHeader>
          <DialogTitle className="text-center text-lg font-semibold">
            {callStatus === 'accepted' ? 'Appel accepté' :
             callStatus === 'rejected' ? 'Appel refusé' :
             callStatus === 'ended' ? 'Appel terminé' :
             `Appel ${callType === 'video' ? 'vidéo' : 'audio'} en cours`}
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          {renderStatusContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StudentCallModal;
