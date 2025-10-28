import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface VerifiedBadgeProps {
  size?: number;
  className?: string;
  showTooltip?: boolean;
}

/**
 * Badge de certification EducaTok Verified
 * Affiche un badge professionnel avec bordures dentelées et checkmark
 */
const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({ 
  size = 18, 
  className = '',
  showTooltip = true 
}) => {
  const badge = (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block ${className}`}
      style={{ filter: 'drop-shadow(0 0 8px rgba(0, 172, 238, 0.4))' }}
    >
      {/* Badge circulaire avec bordures dentelées style Instagram */}
      <path
        d="M12 1.5 L12.8 3.2 L14.5 3.2 L13.5 4.5 L14 6 L12 5 L10 6 L10.5 4.5 L9.5 3.2 L11.2 3.2 Z
           M15.5 3.5 L16.3 5.2 L18 5.2 L17 6.5 L17.5 8 L15.5 7 L13.5 8 L14 6.5 L13 5.2 L14.7 5.2 Z
           M18 7 L18.8 8.7 L20.5 8.7 L19.5 10 L20 11.5 L18 10.5 L16 11.5 L16.5 10 L15.5 8.7 L17.2 8.7 Z
           M19.5 11 L20.3 12.7 L22 12.7 L21 14 L21.5 15.5 L19.5 14.5 L17.5 15.5 L18 14 L17 12.7 L18.7 12.7 Z
           M19.5 15 L20.3 16.7 L22 16.7 L21 18 L21.5 19.5 L19.5 18.5 L17.5 19.5 L18 18 L17 16.7 L18.7 16.7 Z
           M18 19 L18.8 20.7 L20.5 20.7 L19.5 22 L20 23.5 L18 22.5 L16 23.5 L16.5 22 L15.5 20.7 L17.2 20.7 Z
           M15.5 22 L16.3 23.7 L18 23.7 L17 25 L17.5 26.5 L15.5 25.5 L13.5 26.5 L14 25 L13 23.7 L14.7 23.7 Z
           M12 23 L12.8 24.7 L14.5 24.7 L13.5 26 L14 27.5 L12 26.5 L10 27.5 L10.5 26 L9.5 24.7 L11.2 24.7 Z
           M8.5 22 L9.3 23.7 L11 23.7 L10 25 L10.5 26.5 L8.5 25.5 L6.5 26.5 L7 25 L6 23.7 L7.7 23.7 Z
           M6 19 L6.8 20.7 L8.5 20.7 L7.5 22 L8 23.5 L6 22.5 L4 23.5 L4.5 22 L3.5 20.7 L5.2 20.7 Z
           M4.5 15 L5.3 16.7 L7 16.7 L6 18 L6.5 19.5 L4.5 18.5 L2.5 19.5 L3 18 L2 16.7 L3.7 16.7 Z
           M4.5 11 L5.3 12.7 L7 12.7 L6 14 L6.5 15.5 L4.5 14.5 L2.5 15.5 L3 14 L2 12.7 L3.7 12.7 Z
           M6 7 L6.8 8.7 L8.5 8.7 L7.5 10 L8 11.5 L6 10.5 L4 11.5 L4.5 10 L3.5 8.7 L5.2 8.7 Z
           M8.5 3.5 L9.3 5.2 L11 5.2 L10 6.5 L10.5 8 L8.5 7 L6.5 8 L7 6.5 L6 5.2 L7.7 5.2 Z"
        fill="#00ACEE"
        transform="scale(0.5) translate(12, 12)"
      />
      
      {/* Cercle central */}
      <circle cx="12" cy="12" r="8.5" fill="#00ACEE" />
      
      {/* Effet de brillance */}
      <circle cx="12" cy="12" r="8.5" fill="url(#gradient)" opacity="0.3" />
      
      {/* Checkmark blanc épais */}
      <path
        d="M9.5 12L11 13.5L14.5 10"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      
      <defs>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="white" stopOpacity="0.6" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );

  if (!showTooltip) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">EducaTok Verified</p>
          <p className="text-xs text-muted-foreground">Compte certifié</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default VerifiedBadge;
