// Animation de gain de Habbah style jeu vidéo — affiche "+X H" flottant avec la pièce Habbah
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import coinHabbah from '@/assets/coin-habbah.png';
import type { HabbahGainAnchor } from '@/hooks/useHabbahGainNotifier';

export interface HabbahGain {
  id: string;
  amount: number;
  label: string; // ex: "Like", "Commentaire", "Partage"
  anchor?: HabbahGainAnchor;
}

interface HabbahGainAnimationProps {
  gains: HabbahGain[];
  onComplete: (id: string) => void;
}

const HabbahGainAnimation: React.FC<HabbahGainAnimationProps> = ({ gains, onComplete }) => {
  return (
    <div className="fixed inset-0 pointer-events-none z-[999999]">
      <AnimatePresence>
        {gains.map((gain, index) => (
          <GainPopup key={gain.id} gain={gain} index={index} onComplete={() => onComplete(gain.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
};

const GainPopup: React.FC<{ gain: HabbahGain; index: number; onComplete: () => void }> = ({
  gain,
  index,
  onComplete,
}) => {
  const isLoss = gain.amount < 0;
  const absoluteAmount = Math.abs(gain.amount);

  useEffect(() => {
    const timer = setTimeout(onComplete, 2000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  const anchoredStyle = gain.anchor
    ? {
        left: gain.anchor.x,
        top: gain.anchor.y,
      }
    : undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.5 }}
      animate={{ opacity: 1, y: gain.anchor ? -24 : -(index * 50), scale: 1 }}
      exit={{ opacity: 0, y: -80, scale: 0.8 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={gain.anchor ? 'absolute flex items-center gap-2' : 'absolute left-1/2 top-24 flex -translate-x-1/2 items-center gap-2'}
      style={anchoredStyle}
    >
      {/* Glow background */}
      <motion.div
        className="relative flex items-center gap-2 px-5 py-2.5 rounded-full shadow-2xl"
        style={{
          background: isLoss
            ? 'linear-gradient(135deg, hsl(0 78% 52%), hsl(12 88% 46%))'
            : 'linear-gradient(135deg, hsl(45 100% 51%), hsl(36 100% 50%))',
          boxShadow: isLoss
            ? '0 0 30px hsla(0, 78%, 52%, 0.45), 0 0 60px hsla(0, 78%, 52%, 0.2)'
            : '0 0 30px hsla(45, 100%, 51%, 0.5), 0 0 60px hsla(45, 100%, 51%, 0.2)',
        }}
        animate={{
          boxShadow: [
            isLoss
              ? '0 0 20px hsla(0, 78%, 52%, 0.35), 0 0 40px hsla(0, 78%, 52%, 0.12)'
              : '0 0 20px hsla(45, 100%, 51%, 0.4), 0 0 40px hsla(45, 100%, 51%, 0.15)',
            isLoss
              ? '0 0 35px hsla(0, 78%, 52%, 0.55), 0 0 70px hsla(0, 78%, 52%, 0.22)'
              : '0 0 35px hsla(45, 100%, 51%, 0.6), 0 0 70px hsla(45, 100%, 51%, 0.3)',
            isLoss
              ? '0 0 20px hsla(0, 78%, 52%, 0.35), 0 0 40px hsla(0, 78%, 52%, 0.12)'
              : '0 0 20px hsla(45, 100%, 51%, 0.4), 0 0 40px hsla(45, 100%, 51%, 0.15)',
          ],
        }}
        transition={{ duration: 1, repeat: 1 }}
      >
        {/* Pièce Habbah animée */}
        <motion.img
          src={coinHabbah}
          alt="Habbah"
          className="w-8 h-8 object-contain"
          animate={{ rotate: [0, 20, -20, 0], scale: [1, 1.3, 1] }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
        />

        {/* Montant */}
        <motion.span
          className="text-xl font-black text-white drop-shadow-lg tracking-wide"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          {isLoss ? '-' : '+'}{absoluteAmount} H
        </motion.span>

        {/* Particules */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full"
            style={{ background: isLoss ? 'hsl(0 90% 75%)' : 'hsl(45 100% 70%)' }}
            initial={{ x: 0, y: 0, opacity: 1 }}
            animate={{
              x: (Math.random() - 0.5) * 80,
              y: (Math.random() - 0.5) * 60,
              opacity: 0,
              scale: [1, 0],
            }}
            transition={{ duration: 0.8, delay: 0.2 + i * 0.05 }}
          />
        ))}
      </motion.div>

      {/* Label de l'action */}
      <motion.span
        className="text-sm font-semibold text-white/90 bg-black/40 backdrop-blur-sm px-3 py-1 rounded-full"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
      >
        {gain.label}
      </motion.span>
    </motion.div>
  );
};

export default HabbahGainAnimation;
