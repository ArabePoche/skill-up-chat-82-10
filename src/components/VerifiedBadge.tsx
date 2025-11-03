import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface VerifiedBadgeProps {
  size?: number;
  className?: string;
  showTooltip?: boolean;
}

/**
 * Badge de certification EducaTok Verified
 * Affiche un badge professionnel avec bordures dentelées style Instagram/WhatsApp
 */
const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({ 
  size = 22, 
  className = '',
  showTooltip = true 
}) => {
  // Génération du path dentelé avec 16 pointes
  const generateStarPath = () => {
    const centerX = 12;
    const centerY = 12;
    const outerRadius = 11;
    const innerRadius = 9.5;
    const points = 16;
    let path = '';
    
    for (let i = 0; i < points * 2; i++) {
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      path += `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)},${y.toFixed(2)} `;
    }
    path += 'Z';
    return path;
  };

  const badge = (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block ${className}`}
      style={{ filter: 'drop-shadow(0 0 6px rgba(0, 172, 238, 0.3))' }}
    >
      {/* Badge avec bordures dentelées style Instagram/WhatsApp */}
      <path
        d={generateStarPath()}
        fill="#00ACEE"
      />
      
      {/* Cercle central bleu */}
      <circle cx="12" cy="12" r="8" fill="#00ACEE" />
      
      {/* Effet de brillance subtil */}
      <circle cx="12" cy="12" r="8" fill="url(#badgeGradient)" opacity="0.25" />
      
      {/* Checkmark blanc */}
      <path
        d="M9.5 12L11 13.5L14.5 10"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      
      <defs>
        <linearGradient id="badgeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="white" stopOpacity="0.5" />
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
