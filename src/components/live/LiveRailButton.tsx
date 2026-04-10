// Bouton d'accès au rail des lives, affiché en haut à gauche du feed TikTok.
import { Button } from '@/components/ui/button';
import { Radio } from 'lucide-react';
import React from 'react';

interface LiveRailButtonProps {
    isOpen: boolean;
    liveCount: number;
    onToggle: () => void;
}

const LiveRailButton: React.FC<LiveRailButtonProps> = ({ isOpen, liveCount, onToggle }) => {
    const isLive = liveCount > 0;

    return (
        <Button
            variant="ghost"
            onClick={onToggle}
            className={`h-12 w-12 rounded-full backdrop-blur-sm text-white border transition-colors ${
                isLive
                    ? 'bg-red-600/80 border-red-400/40 hover:bg-red-500/80'
                    : isOpen
                        ? 'bg-red-600/80 border-red-400/40 hover:bg-red-500/80'
                        : 'bg-black/30 border-white/20 hover:bg-black/50'
            }`}
            aria-label={isOpen ? 'Revenir au flux vidéos' : 'Afficher les lives'}
        >
            <Radio size={18} />
            {isLive && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-md">
                    {liveCount}
                </span>
            )}
        </Button>
    );
};

export default LiveRailButton;
