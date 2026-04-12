import React from 'react';
import { motion } from 'framer-motion';

interface LiveTeaGiftOverlayProps {
  userName: string;
  content: string;
}

const LiveTeaGiftOverlay: React.FC<LiveTeaGiftOverlayProps> = ({ userName, content }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.04 }}
      transition={{ duration: 0.38, ease: 'easeOut' }}
      className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(255,236,179,0.18),_transparent_40%),linear-gradient(135deg,rgba(251,191,36,0.14),rgba(15,23,42,0.18),rgba(251,146,60,0.16))]"
    >
      <div className="relative mx-4 w-full max-w-3xl overflow-hidden rounded-[2rem] border border-white/15 bg-[linear-gradient(145deg,rgba(10,10,10,0.78),rgba(28,25,23,0.72))] px-6 py-7 shadow-[0_32px_90px_rgba(15,23,42,0.45)] backdrop-blur-2xl sm:px-10 sm:py-9">
        <motion.div
          animate={{ x: [0, 10, 0], y: [0, -8, 0] }}
          transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -left-14 top-2 h-40 w-40 rounded-full bg-amber-400/18 blur-3xl"
        />
        <motion.div
          animate={{ x: [0, -12, 0], y: [0, 10, 0] }}
          transition={{ duration: 5.4, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -right-8 bottom-0 h-44 w-44 rounded-full bg-orange-500/16 blur-3xl"
        />

        <div className="relative flex flex-col items-center gap-6 md:flex-row md:items-end md:justify-between">
          <div className="relative flex w-full max-w-[27rem] items-end justify-center gap-5 md:justify-start">
            <motion.div
              animate={{ rotate: [0, -5, -12, -7, 0], x: [0, -4, -10, -4, 0], y: [0, -2, -8, -4, 0] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
              style={{ transformOrigin: '78% 34%' }}
              className="relative h-40 w-40 shrink-0"
            >
              <svg viewBox="0 0 220 220" className="h-full w-full drop-shadow-[0_18px_30px_rgba(245,158,11,0.3)]">
                <defs>
                  <linearGradient id="tea-pot-body" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fff7ed" />
                    <stop offset="52%" stopColor="#fdba74" />
                    <stop offset="100%" stopColor="#c2410c" />
                  </linearGradient>
                  <linearGradient id="tea-pot-shine" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.88)" />
                    <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                  </linearGradient>
                </defs>
                <ellipse cx="112" cy="196" rx="58" ry="12" fill="rgba(15,23,42,0.24)" />
                <path
                  d="M84 58c0-10 9-18 20-18h32c11 0 20 8 20 18v11H84V58Z"
                  fill="url(#tea-pot-body)"
                  stroke="rgba(255,255,255,0.55)"
                  strokeWidth="3"
                />
                <path
                  d="M108 32c0-8 6-14 14-14 8 0 14 6 14 14"
                  fill="none"
                  stroke="#fff7ed"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
                <path
                  d="M62 95c0-35 25-60 60-60 40 0 71 25 71 72 0 42-28 73-74 73H96c-36 0-58-29-58-57 0-15 7-25 24-28Z"
                  fill="url(#tea-pot-body)"
                  stroke="rgba(255,255,255,0.55)"
                  strokeWidth="4"
                />
                <path
                  d="M57 102c-19 4-33 21-33 42 0 23 18 42 41 42"
                  fill="none"
                  stroke="#fed7aa"
                  strokeWidth="10"
                  strokeLinecap="round"
                />
                <path
                  d="M174 104c18 1 31 7 40 20-19 2-34 9-48 21"
                  fill="url(#tea-pot-body)"
                  stroke="rgba(255,255,255,0.55)"
                  strokeWidth="4"
                  strokeLinejoin="round"
                />
                <path
                  d="M92 76c10-16 46-18 66 0"
                  fill="none"
                  stroke="url(#tea-pot-shine)"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                <ellipse cx="104" cy="112" rx="14" ry="18" fill="rgba(255,255,255,0.28)" />
              </svg>
            </motion.div>

            <div className="relative h-40 w-32 shrink-0">
              <motion.div
                initial={{ opacity: 0, scaleY: 0.1 }}
                animate={{ opacity: [0.3, 1, 1], scaleY: [0.1, 1, 1] }}
                transition={{ duration: 1.6, ease: 'easeInOut' }}
                className="absolute left-[-18px] top-[28px] h-24 w-3 origin-top rounded-full bg-gradient-to-b from-amber-100 via-amber-300 to-orange-500 shadow-[0_0_22px_rgba(251,191,36,0.55)]"
                style={{ transform: 'rotate(18deg)' }}
              />
              <motion.div
                animate={{ y: [0, -14, -22], opacity: [0, 0.55, 0] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut', delay: 1.3 }}
                className="absolute right-5 top-0 h-16 w-6 rounded-full border border-white/25 border-b-0 border-r-0"
              />
              <motion.div
                animate={{ y: [0, -12, -20], opacity: [0, 0.48, 0] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut', delay: 1.7 }}
                className="absolute right-11 top-4 h-14 w-5 rounded-full border border-white/20 border-b-0 border-r-0"
              />
              <div className="absolute bottom-2 right-0 h-28 w-24 overflow-hidden rounded-b-[1.8rem] rounded-t-[1rem] border-[3px] border-white/55 bg-white/10 shadow-[inset_0_0_24px_rgba(255,255,255,0.15)] backdrop-blur-sm">
                <motion.div
                  initial={{ height: '8%' }}
                  animate={{ height: ['8%', '74%', '74%'] }}
                  transition={{ duration: 2.3, ease: 'easeInOut' }}
                  className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,#fde68a_0%,#f59e0b_48%,#b45309_100%)]"
                />
                <div className="absolute inset-x-3 top-3 h-1 rounded-full bg-white/45" />
                <div className="absolute right-3 top-4 h-16 w-1.5 rounded-full bg-white/30" />
              </div>
              <div className="absolute bottom-0 right-5 h-3 w-14 rounded-full bg-slate-950/35 blur-sm" />
            </div>
          </div>

          <div className="relative z-10 text-center md:max-w-xs md:text-left">
            <div className="inline-flex items-center rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.28em] text-amber-200">
              Instant thé
            </div>
            <p className="mt-3 text-2xl font-black text-white sm:text-3xl">{userName}</p>
            <p className="mt-2 text-sm font-semibold text-amber-100/90 sm:text-base">{content}</p>
            <p className="mt-3 text-xs font-medium uppercase tracking-[0.24em] text-white/45">
              Théière premium · 1 SC
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default LiveTeaGiftOverlay;
