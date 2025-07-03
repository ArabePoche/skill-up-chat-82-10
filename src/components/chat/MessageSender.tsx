
import React from 'react';

interface MessageSenderProps {
  profile?: {
    first_name?: string;
    last_name?: string;
    username?: string;
    is_teacher?: boolean;
  };
}

const MessageSender: React.FC<MessageSenderProps> = ({ profile }) => {
  const formatSenderName = (profile: any) => {
    if (!profile) return 'Utilisateur';
    const firstName = profile.first_name || '';
    const lastName = profile.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || profile.username || 'Utilisateur';
  };

  const senderIsTeacher = profile?.is_teacher;

  return (
    <div className="flex items-center space-x-2 mb-1">
      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
        senderIsTeacher ? 'bg-blue-500' : 'bg-[#25d366]'
      }`}>
        <span className="text-white text-xs">
          {senderIsTeacher ? '👨‍🏫' : '👨‍🎓'}
        </span>
      </div>
      <span className={`text-xs font-medium ${
        senderIsTeacher ? 'text-blue-600' : 'text-[#25d366]'
      }`}>
        {formatSenderName(profile)}
        {senderIsTeacher && <span className="ml-1 text-xs">(Professeur)</span>}
      </span>
    </div>
  );
};

export default MessageSender;
