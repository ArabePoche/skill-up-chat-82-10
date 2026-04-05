/**
 * FloatingCommentBar – Barre de commentaires flottante transparente avec emojis populaires.
 * Se ferme par swipe gauche/droite. Apparaît au-dessus du lecteur vidéo pour inviter
 * les utilisateurs à interagir rapidement.
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Send, Smile } from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface FloatingCommentBarProps {
  onSubmit: (text: string) => Promise<boolean>;
  onEmojiReact?: (emoji: string) => void;
  isSubmitting?: boolean;
  placeholder?: string;
}

const POPULAR_EMOJIS = ['❤️', '😂', '🔥', '👍', '🥳', '🙏', '🎁'];

const FloatingCommentBar: React.FC<FloatingCommentBarProps> = ({
  onSubmit,
  onEmojiReact,
  isSubmitting = false,
  placeholder = '😊 اكتب تعليقًا أو سؤالاً هنا...',
}) => {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [isVisible, setIsVisible] = useState(true);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-150, 0, 150], [0, 1, 0]);
  const scale = useTransform(x, [-150, 0, 150], [0.8, 1, 0.8]);

  // Auto-show after being dismissed (after 8s)
  useEffect(() => {
    if (!isVisible) {
      const timer = setTimeout(() => setIsVisible(true), 8000);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 100 || Math.abs(info.velocity.x) > 500) {
      setIsVisible(false);
    }
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!user) {
      toast.error('Connectez-vous pour commenter');
      return;
    }
    if (!text.trim()) return;
    const success = await onSubmit(text.trim());
    if (success) {
      setText('');
      inputRef.current?.blur();
    }
  };

  const handleEmojiClick = (emoji: string) => {
    if (!user) {
      toast.error('Connectez-vous pour réagir');
      return;
    }
    onEmojiReact?.(emoji);
    // Also add as quick comment
    onSubmit(emoji).then((ok) => {
      if (ok) toast.success('Réaction envoyée !');
    });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="absolute bottom-2 left-2 right-2 z-40"
          initial={{ y: 60, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.2 } }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          {/* Emoji bar */}
          <motion.div
            className="flex items-center gap-1 mb-1.5 px-1 overflow-x-auto scrollbar-hide"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            <div className="flex items-center gap-1 bg-black/30 backdrop-blur-md rounded-full px-2 py-1 border border-white/10">
              {POPULAR_EMOJIS.map((emoji) => (
                <motion.button
                  key={emoji}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEmojiClick(emoji);
                  }}
                  className="text-xl sm:text-2xl p-1.5 rounded-full hover:bg-white/20 active:scale-125 transition-all duration-150 select-none"
                  whileTap={{ scale: 1.4, rotate: [0, -10, 10, 0] }}
                  whileHover={{ scale: 1.15, y: -3 }}
                >
                  {emoji}
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Comment input – swipeable */}
          <motion.div
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.4}
            onDragEnd={handleDragEnd}
            style={{ x, opacity, scale }}
            className="relative"
          >
            <form
              onSubmit={handleSubmit}
              className={`
                flex items-center gap-2 rounded-full px-3 py-2
                bg-black/40 backdrop-blur-xl border transition-all duration-300
                ${isFocused
                  ? 'border-primary/50 bg-black/60 shadow-[0_0_20px_rgba(var(--primary),0.15)]'
                  : 'border-white/15 shadow-lg'
                }
              `}
              onClick={(e) => e.stopPropagation()}
            >
              <Smile size={18} className="text-white/60 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={placeholder}
                className="
                  flex-1 bg-transparent text-white text-sm placeholder:text-white/50
                  outline-none border-none min-w-0
                "
                maxLength={300}
                onClick={(e) => e.stopPropagation()}
                dir="auto"
              />
              <AnimatePresence mode="wait">
                {text.trim() && (
                  <motion.button
                    type="submit"
                    disabled={isSubmitting}
                    initial={{ scale: 0, rotate: -90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, rotate: 90 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                    className="
                      w-8 h-8 rounded-full bg-primary flex items-center justify-center
                      text-primary-foreground flex-shrink-0 hover:brightness-110
                      active:scale-95 transition-all disabled:opacity-50
                    "
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Send size={14} />
                  </motion.button>
                )}
              </AnimatePresence>
            </form>

            {/* Swipe hint */}
            <motion.div
              className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              transition={{ delay: 2 }}
            >
              <div className="w-8 h-0.5 rounded-full bg-white/30" />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FloatingCommentBar;
