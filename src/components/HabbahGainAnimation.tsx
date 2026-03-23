// Animation de gain de Habbah style jeu vidéo — affiche "+X H" flottant avec effets
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface HabbahGain {
  id: string;
  amount: number;
  label: string; // ex: "Like", "Commentaire", "Partage"
}

interface HabbahGainAnimationProps {
  gains: HabbahGain[];
  onComplete: (id: string) => void;
}

const HabbahGainAnimation: React.FC<HabbahGainAnimationProps> = ({ gains, onComplete }) => {
  return (
    <div className="fixed inset-0 pointer-events-none z-[999999] flex flex-col items-center justify-start pt-24">
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
  useEffect(() => {
    const timer = setTimeout(onComplete, 2000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.5 }}
      animate={{ opacity: 1, y: -(index * 50), scale: 1 }}
      exit={{ opacity: 0, y: -80, scale: 0.8 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="flex items-center gap-2 mb-2"
    >
      {/* Glow background */}
      <motion.div
        className="relative flex items-center gap-2 px-5 py-2.5 rounded-full shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, hsl(45 100% 51%), hsl(36 100% 50%))',
          boxShadow: '0 0 30px hsla(45, 100%, 51%, 0.5), 0 0 60px hsla(45, 100%, 51%, 0.2)',
        }}
        animate={{
          boxShadow: [
            '0 0 20px hsla(45, 100%, 51%, 0.4), 0 0 40px hsla(45, 100%, 51%, 0.15)',
            '0 0 35px hsla(45, 100%, 51%, 0.6), 0 0 70px hsla(45, 100%, 51%, 0.3)',
            '0 0 20px hsla(45, 100%, 51%, 0.4), 0 0 40px hsla(45, 100%, 51%, 0.15)',
          ],
        }}
        transition={{ duration: 1, repeat: 1 }}
      >
        {/* Icône étoile animée */}
        <motion.span
          className="text-2xl"
          animate={{ rotate: [0, 20, -20, 0], scale: [1, 1.3, 1] }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
        >
          ⭐
        </motion.span>

        {/* Montant */}
        <motion.span
          className="text-xl font-black text-white drop-shadow-lg tracking-wide"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          +{gain.amount} H
        </motion.span>

        {/* Particules */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full"
            style={{ background: 'hsl(45 100% 70%)' }}
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
