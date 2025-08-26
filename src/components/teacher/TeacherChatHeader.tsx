
import React from 'react';
import { ArrowLeft, Users, Wifi, WifiOff, Video, Phone, MonitorPlay } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCallFunctionality } from '@/hooks/useCallFunctionality';
import { toast } from 'sonner';

interface Student {
  id: string;
  user_id: string;
  profiles: {
    id: string;
    first_name?: string;
    last_name?: string;
    username?: string;
    avatar_url?: string;
  } | null;
}

interface TeacherChatHeaderProps {
  formation: {
    id: string;
    title: string;
  };
  student: Student;
  lesson: {
    id: string;
    title: string;
  };
  isSubscribed: boolean;
  typingUsersCount: number;
  onBack: () => void;
  onOpenStudio?: () => void;
}

const TeacherChatHeader: React.FC<TeacherChatHeaderProps> = ({
  formation,
  student,
  lesson,
  isSubscribed,
  typingUsersCount,
  onBack,
  onOpenStudio
}) => {
  const studentName = student.profiles?.first_name || student.profiles?.username || 'Étudiant';
  const { initiateCall } = useCallFunctionality(formation.id);

  const handleVideoCall = async () => {
    try {
      const success = await initiateCall('video', student.user_id, lesson.id);
      if (!success) {
        toast.error('Impossible de démarrer l\'appel vidéo');
      }
    } catch (error) {
      console.error('Erreur lors de l\'appel vidéo:', error);
      toast.error('Erreur lors de l\'appel vidéo');
    }
  };

  const handleAudioCall = async () => {
    try {
      const success = await initiateCall('audio', student.user_id, lesson.id);
      if (!success) {
        toast.error('Impossible de démarrer l\'appel audio');
      }
    } catch (error) {
      console.error('Erreur lors de l\'appel audio:', error);
      toast.error('Erreur lors de l\'appel audio');
    }
  };

  return (
    // Header du chat enseignant, sticky en haut de l'écran pour rester visible lors du scroll
    <div className="bg-white border-b p-4 shadow-sm sticky top-0 z-30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="lg:hidden"
          >
            <ArrowLeft size={20} />
          </Button>
          
          <div className="flex items-center gap-3">
            {student.profiles?.avatar_url ? (
              <img
                src={student.profiles.avatar_url}
                alt={studentName}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-sm font-medium text-blue-600">
                  {studentName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            
            <div>
              <h2 className="font-semibold text-gray-900">{studentName}</h2>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>{lesson.title}</span>
                
              </div>
              
              {typingUsersCount > 0 && (
                <div className="flex items-center gap-1 text-sm text-blue-600">
                  <Users size={14} />
                  <span>{studentName} est en train d'écrire...</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Boutons d'appels et studio */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-blue-600 hover:bg-blue-50"
            onClick={onOpenStudio}
            title="Studio d'enseignement"
          >
            <MonitorPlay size={20} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-green-600 hover:bg-green-50"
            onClick={handleVideoCall}
            title="Appel vidéo"
          >
            <Video size={20} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-green-600 hover:bg-green-50"
            onClick={handleAudioCall}
            title="Appel vocal"
          >
            <Phone size={20} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TeacherChatHeader;