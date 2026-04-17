import React from 'react';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnimatePresence, motion } from 'framer-motion';

interface TiktokVideoLikeButtonProps {
  isLiked: boolean;
  likesCount: number;
  onLike: (event: React.MouseEvent<HTMLButtonElement>) => void;
  showLikeBurst: boolean;
  formatCount: (count: number) => string;
}

const TiktokVideoLikeButton: React.FC<TiktokVideoLikeButtonProps> = ({
  isLiked,
  likesCount,
  onLike,
  showLikeBurst,
  formatCount,
}) => {
  return (
    <div className="relative flex flex-col items-center">
      <AnimatePresence>
        {showLikeBurst && (
          <>
            <motion.div
              initial={{ opacity: 0.9, scale: 0.45 }}
              animate={{ opacity: 0, scale: 3.1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.8, ease: 'easeOut' }}
              className="absolute top-0 left-1/2 h-12 w-12 -translate-x-1/2 rounded-full bg-red-500/90 blur-[1px]"
            />
            <motion.div
              initial={{ opacity: 0.95, scale: 0.8 }}
              animate={{ opacity: 0, scale: 2.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.2, ease: 'easeOut' }}
              className="absolute top-0 left-1/2 h-12 w-12 -translate-x-1/2 rounded-full border-2 border-red-300/90"
            />
            {[
              { x: 0, y: -34 },
              { x: 26, y: -18 },
              { x: 30, y: 12 },
              { x: 0, y: 30 },
              { x: -28, y: 14 },
              { x: -24, y: -20 },
            ].map((particle, index) => (
              <motion.span
                key={index}
                initial={{ opacity: 0.95, x: 0, y: 0, scale: 0.9 }}
                animate={{ opacity: 0, x: particle.x, y: particle.y, scale: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.2, ease: 'easeOut', delay: index * 0.05 }}
                className="absolute left-1/2 top-6 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-red-300"
              />
            ))}
          </>
        )}
      </AnimatePresence>

      <Button
        variant="ghost"
        size="icon"
        onClick={onLike}
        className={`relative z-10 w-12 h-12 rounded-full border-0 bg-transparent shadow-none transition-all hover:scale-110 hover:bg-white/10 active:bg-transparent drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] ${
          isLiked ? '!text-red-500' : 'text-white'
        }`}
      >
        <Heart size={28} className={isLiked ? 'fill-red-500 stroke-red-500 text-red-500' : 'fill-white stroke-white text-white'} />
      </Button>
      <span className="text-white text-xs mt-0.5 font-medium drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
        {formatCount(likesCount)}
      </span>
    </div>
  );
};

export default TiktokVideoLikeButton;
