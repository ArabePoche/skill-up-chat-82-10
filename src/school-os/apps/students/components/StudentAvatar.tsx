// Composant Avatar pour afficher la photo d'un élève
import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { User } from 'lucide-react';

interface StudentAvatarProps {
  photoUrl?: string | null;
  firstName: string;
  lastName: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const StudentAvatar: React.FC<StudentAvatarProps> = ({
  photoUrl,
  firstName,
  lastName,
  className = '',
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-8 h-8',
  };

  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

  return (
    <Avatar className={`${sizeClasses[size]} ${className}`}>
      {photoUrl && <AvatarImage src={photoUrl} alt={`${firstName} ${lastName}`} />}
      <AvatarFallback className="bg-primary/10 text-primary">
        {photoUrl ? (
          <User className={iconSizes[size]} />
        ) : (
          <span className="text-xs font-medium">{initials}</span>
        )}
      </AvatarFallback>
    </Avatar>
  );
};
