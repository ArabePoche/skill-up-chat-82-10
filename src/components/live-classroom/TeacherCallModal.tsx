// Modal d'appel côté professeur avec sonnerie
import React, { useEffect, useState, useRef } from 'react';
import { Phone, PhoneOff, Video, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { NotificationSoundService } from '@/services/NotificationSoundService';
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

  useEffect(() => {
    if (isOpen) {
      setIsRinging(true);
      NotificationSoundService.startRingtone();
    } else {
      setIsRinging(false);
      NotificationSoundService.stopRingtone();
    }

    return () => {
      NotificationSoundService.stopRingtone();
    };
  }, [isOpen]);

  const handleAccept = () => {
    setIsRinging(false);
    NotificationSoundService.stopRingtone();
    onAccept();
  };

  const handleReject = () => {
    setIsRinging(false);
    NotificationSoundService.stopRingtone();
    onReject();
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => { }}>
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