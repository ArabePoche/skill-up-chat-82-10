/**
 * Avatar cliquable pour les élèves dans le chat groupe
 * Permet aux professeurs d'ouvrir le modal d'envoi d'exercice
 */
import React, { useState } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import SendExerciseModalGroup from '@/components/teacher/SendExerciseModalGroup';

interface StudentProfile {
  id: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  avatar_url?: string;
  is_teacher?: boolean;
}

interface ClickableStudentAvatarProps {
  profile: StudentProfile;
  isTeacherViewing: boolean;
  formationId?: string;
  levelId?: string;
  isGroupChat?: boolean;
}

const ClickableStudentAvatar: React.FC<ClickableStudentAvatarProps> = ({
  profile,
  isTeacherViewing,
  formationId,
  levelId,
  isGroupChat = false,
}) => {
  const [showExerciseModal, setShowExerciseModal] = useState(false);

  const formatSenderName = () => {
    if (!profile) return 'Utilisateur';
    const firstName = profile.first_name || '';
    const lastName = profile.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || profile.username || 'Utilisateur';
  };

  const getInitials = () => {
    const name = formatSenderName();
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const senderIsTeacher = profile?.is_teacher;
  const canOpenExerciseModal = isTeacherViewing && !senderIsTeacher && isGroupChat && formationId && levelId;

  const handleAvatarClick = (e: React.MouseEvent) => {
    if (canOpenExerciseModal) {
      e.stopPropagation();
      setShowExerciseModal(true);
    }
  };

  const avatarContent = (
    <div 
      className={`flex items-center space-x-2 mb-1 ${canOpenExerciseModal ? 'cursor-pointer group' : ''}`}
      onClick={handleAvatarClick}
    >
      <Avatar className={`w-6 h-6 transition-all ${
        canOpenExerciseModal 
          ? 'ring-2 ring-transparent group-hover:ring-primary/50 group-hover:scale-110' 
          : ''
      }`}>
        {profile?.avatar_url ? (
          <AvatarImage src={profile.avatar_url} alt={formatSenderName()} />
        ) : null}
        <AvatarFallback className={`text-[10px] font-medium ${
          senderIsTeacher ? 'bg-blue-500 text-white' : 'bg-[#25d366] text-white'
        }`}>
          {senderIsTeacher ? '👨‍🏫' : getInitials()}
        </AvatarFallback>
      </Avatar>
      <span className={`text-xs font-medium ${
        senderIsTeacher ? 'text-blue-600' : 'text-[#25d366]'
      } ${canOpenExerciseModal ? 'group-hover:underline' : ''}`}>
        {formatSenderName()}
        {senderIsTeacher && <span className="ml-1 text-xs">(Professeur)</span>}
      </span>
    </div>
  );

  return (
    <>
      {canOpenExerciseModal ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {avatarContent}
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Cliquer pour envoyer un exercice
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        avatarContent
      )}

      {/* Modal d'envoi d'exercice */}
      {canOpenExerciseModal && formationId && levelId && (
        <SendExerciseModalGroup
          isOpen={showExerciseModal}
          onClose={() => setShowExerciseModal(false)}
          formationId={formationId}
          levelId={levelId}
          studentId={profile.id}
          studentName={formatSenderName()}
          studentAvatarUrl={profile.avatar_url}
        />
      )}
    </>
  );
};

export default ClickableStudentAvatar;
