
import React from 'react';
import { ArrowLeft, Video, Phone, MoreVertical } from 'lucide-react';
import { useSubscriptionLimits } from '@/hooks/useSubscriptionLimits';
import { SubscriptionAlert } from './SubscriptionAlert';
import { SubscriptionTimer } from '@/components/ui/subscription-timer';
import { useCallFunctionality } from '@/hooks/useCallFunctionality';
import { toast } from 'sonner';

interface ChatHeaderProps {
  lesson: {
    id: string;
    title: string;
    duration?: string;
  };
  formation?: {
    title: string;
    id: string;
  };
  onBack: () => void;
  isTeacherView?: boolean;
  studentName?: string;
  isTeacher?: boolean;
  onUpgrade?: () => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  lesson,
  formation,
  onBack,
  isTeacherView = false,
  studentName,
  isTeacher = false,
  onUpgrade
}) => {
  const { checkPermission } = useSubscriptionLimits(formation?.id || '');
  const { initiateCall } = useCallFunctionality(formation?.id || '');

  const handleVoiceCall = async () => {
    const permission = checkPermission('call');
    if (!permission.allowed && permission.message) {
      toast.error(permission.message);
      onUpgrade?.();
      return;
    }
    
    try {
      const success = await initiateCall('audio', '', lesson.id);
      if (!success) {
        toast.error('Impossible de démarrer l\'appel audio');
      }
    } catch (error) {
      console.error('Erreur lors de l\'appel audio:', error);
      toast.error('Erreur lors de l\'appel audio');
    }
  };

  const handleVideoCall = async () => {
    const permission = checkPermission('video_call');
    if (!permission.allowed && permission.message) {
      toast.error(permission.message);
      onUpgrade?.();
      return;
    }
    
    try {
      const success = await initiateCall('video', '', lesson.id);
      if (!success) {
        toast.error('Impossible de démarrer l\'appel vidéo');
      }
    } catch (error) {
      console.error('Erreur lors de l\'appel vidéo:', error);
      toast.error('Erreur lors de l\'appel vidéo');
    }
  };

  return (
    // Header de chat principal, sticky en haut de l'écran pour rester visible lors du scroll
    <div className="bg-[#25d366] text-white fixed top-0 left-0 right-0 z-50 bg-white border-b shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center flex-1">
          <button
            onClick={onBack}
            className="mr-3 p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mr-3">
            <span className="text-white font-bold text-sm">
              {isTeacherView ? '👨‍🏫' : lesson.title.charAt(0)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-lg truncate">{lesson.title}</h1>
            <p className="text-xs text-white/80">
              {isTeacherView 
                ? `Discussion avec ${studentName}`
                : `Formation: ${formation?.title || 'Formation'} • ${lesson.duration || 'Durée inconnue'}`
              }
              {isTeacher && !isTeacherView && <span className="ml-2">👨‍🏫 Professeur</span>}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-1">
          <button 
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
            onClick={handleVideoCall}
            title="Appel vidéo"
          >
            <Video size={20} />
          </button>
          <button 
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
            onClick={handleVoiceCall}
            title="Appel vocal"
          >
            <Phone size={20} />
          </button>
          <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <MoreVertical size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;
