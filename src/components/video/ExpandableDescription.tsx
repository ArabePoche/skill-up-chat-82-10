/**
 * ExpandableDescription - Affiche une description tronquée avec un bouton "plus"
 * qui ouvre la description complète en plein écran, style TikTok.
 */
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, X } from 'lucide-react';

interface ExpandableDescriptionProps {
  description: string;
  maxLines?: number;
}

const ExpandableDescription: React.FC<ExpandableDescriptionProps> = ({ 
  description, 
  maxLines = 2 
}) => {
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = textRef.current;
    if (el) {
      // Vérifie si le texte dépasse le nombre de lignes autorisé
      setIsOverflowing(el.scrollHeight > el.clientHeight + 2);
    }
  }, [description]);

  return (
    <>
      {/* Description tronquée */}
      <div className="relative">
        <p
          ref={textRef}
          className="text-sm opacity-90"
          style={{
            display: '-webkit-box',
            WebkitLineClamp: maxLines,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {description}
        </p>
        {isOverflowing && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsFullscreen(true);
            }}
            className="text-sm font-semibold opacity-80 hover:opacity-100 mt-0.5 flex items-center gap-0.5"
          >
            plus <ChevronDown size={14} />
          </button>
        )}
      </div>

      {/* Overlay plein écran TikTok-style */}
      {isFullscreen && (
        <div
          className="fixed inset-0 z-[9999] bg-black/95 flex flex-col animate-in slide-in-from-bottom duration-300"
          onClick={() => setIsFullscreen(false)}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <h3 className="text-white font-bold text-lg">Description</h3>
            <button
              onClick={() => setIsFullscreen(false)}
              className="text-white/70 hover:text-white p-1"
            >
              <X size={24} />
            </button>
          </div>

          {/* Contenu scrollable */}
          <div
            className="flex-1 overflow-y-auto p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-white text-base leading-relaxed whitespace-pre-wrap">
              {description}
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default ExpandableDescription;
