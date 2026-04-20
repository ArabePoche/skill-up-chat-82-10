
import React, { useEffect, useRef, useState } from 'react';
import { Coffee, Flag, Heart, Music, Smile, Star, Sun, Car, X, Sticker } from 'lucide-react';
import StickerPicker from './chat/StickerPicker';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  onStickerSelect?: (sticker: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
}

type CategoryKey =
  | 'smileys'
  | 'emotions'
  | 'islam'
  | 'nature'
  | 'food'
  | 'transport'
  | 'flags'
  | 'music'
  | 'symbols';

type CategoryConfig = {
  icon: React.ComponentType<any>;
  label: string;
  accent: string;
  softAccent: string;
  emojis: string[];
};

const emojiCategories: Record<CategoryKey, CategoryConfig> = {
  smileys: {
    icon: Smile,
    label: 'Sourires',
    accent: 'text-amber-500',
    softAccent: 'bg-amber-50 border-amber-200 text-amber-700',
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '�', '😙', '😚', '😋', '😛', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '🤔', '🤗', '🤫', '🫢', '🤕'],
  },
  emotions: {
    icon: Heart,
    label: 'Emotions',
    accent: 'text-rose-500',
    softAccent: 'bg-rose-50 border-rose-200 text-rose-700',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '♥️', '💯', '💢', '💥', '💫', '💦', '💨', '🕳️', '💣', '💬', '👁️‍🗨️', '🗨️', '🗯️', '💭'],
  },
  islam: {
    icon: Star,
    label: 'Islam',
    accent: 'text-emerald-600',
    softAccent: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    emojis: ['🤲', '🕌', '☪️', '📿', '🕋', '🌙', '⭐', '🛐', '🤍', '💚', '🕊️', '☝️', '📖', '✨', '﷽', 'ﷺ', 'آمين', 'الحمد لله', 'إن شاء الله', 'ما شاء الله', 'سبحان الله'],
  },
  nature: {
    icon: Sun,
    label: 'Nature',
    accent: 'text-emerald-500',
    softAccent: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    emojis: ['🌞', '🌝', '🌛', '🌜', '🌚', '🌕', '🌖', '🌗', '🌘', '🌑', '🌒', '🌓', '🌔', '🌙', '⭐', '🌟', '💫', '✨', '☄️', '☀️', '🌤️', '⛅', '🌥️', '☁️', '🌦️', '🌧️', '⛈️', '🌩️', '🌨️', '❄️', '☃️', '⛄'],
  },
  food: {
    icon: Coffee,
    label: 'Food',
    accent: 'text-orange-500',
    softAccent: 'bg-orange-50 border-orange-200 text-orange-700',
    emojis: ['🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🌽', '🥕', '🧄', '🧅', '🥔', '🍠', '🥐', '🍞', '🥖', '🥨', '🧀'],
  },
  transport: {
    icon: Car,
    label: 'Transport',
    accent: 'text-sky-500',
    softAccent: 'bg-sky-50 border-sky-200 text-sky-700',
    emojis: ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🏍️', '🛵', '🚲', '🛴', '🛹', '🚁', '🛸', '✈️', '🛩️', '🛫', '🛬', '🚀', '🛰️', '💺', '🚢', '⛵', '🛶', '🚤'],
  },
  flags: {
    icon: Flag,
    label: 'Pays',
    accent: 'text-indigo-500',
    softAccent: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    emojis: ['🏁', '🚩', '🎌', '🏴', '🏳️', '🇧🇫', '🏳️‍🌈', '🏳️‍⚧️', '🇬🇳', '🇫🇷', '🇺🇸', '🇬🇧', '🇩🇪', '🇪🇸', '🇮🇹', '🇯🇵', '🇨🇳', '🇲🇱', '🇨🇲', '🇰🇷', '🇷🇺', '🇧🇷', '🇨🇦', '🇦🇺', '🇮🇳', '🇲🇽', '🇳🇱', '🇸🇪', '🇳🇴', '🇩🇰', '🇫🇮', '🇵🇱', '🇨🇭', '🇦🇹'],
  },
  music: {
    icon: Music,
    label: 'Musique',
    accent: 'text-fuchsia-500',
    softAccent: 'bg-fuchsia-50 border-fuchsia-200 text-fuchsia-700',
    emojis: ['🎵', '🎶', '🎼', '🎤', '🎧', '📻', '🎙️', '📢', '📣', '📯', '🔔', '🔕', '🎚️', '🎛️', '🎨', '🖌️', '🖍️', '🖊️', '🖋️', '✏️', '✒️', '🖇️', '📎', '🔗'],
  },
  symbols: {
    icon: Star,
    label: 'Symboles',
    accent: 'text-violet-500',
    softAccent: 'bg-violet-50 border-violet-200 text-violet-700',
    emojis: ['⭐', '🌟', '💫', '✨', '🔥', '💥', '💢', '💯', '💢', '💥', '💫', '💦', '💨', '🕳️', '💣', '💬', '👁️‍🗨️', '🗨️', '🗯️', '💭', '💤', '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '👍', '✍️', '🤝', '💪', '👆', '👇', '👏', '🤲', '🫶', '👂', '👀'],
  },
};

const EmojiPicker: React.FC<EmojiPickerProps> = ({ onEmojiSelect, onStickerSelect, isOpen, onToggle, className }) => {

  // Nouvelle logique : tous les groupes d'émojis affichés à la suite, scroll unique
  const [activeTab, setActiveTab] = useState<'emoji' | 'sticker'>('emoji');
  const pickerRef = useRef<HTMLDivElement>(null);
  const categoryEntries = Object.entries(emojiCategories) as Array<[CategoryKey, CategoryConfig]>;

  const isTextEntry = (value: string) => value.length > 3 || /[\u0600-\u06FF]/.test(value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        onToggle();
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onToggle();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onToggle]);

  if (!isOpen) return null;

  const handleEmojiSelect = (emoji: string) => {
    onEmojiSelect(emoji.trim());
    onToggle();
  };

  return (
    <div
      ref={pickerRef}
      role="dialog"
      aria-label="Sélecteur d'emojis et stickers"
      className={`w-[85vw] max-w-[340px] sm:w-[350px] z-50 flex flex-col bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 animate-in fade-in zoom-in-95 duration-200 overflow-hidden ${className !== undefined ? className : 'absolute bottom-full left-0 mb-3'}`}
    >
      {/* Tab switcher: Emojis vs Stickers */}
      <div className="flex border-b border-gray-100">
        <button
          type="button"
          onClick={() => setActiveTab('emoji')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[12px] font-semibold transition-colors ${
            activeTab === 'emoji'
              ? 'text-violet-600 border-b-2 border-violet-500 bg-violet-50/50'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Smile size={15} />
          Emojis
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('sticker')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[12px] font-semibold transition-colors ${
            activeTab === 'sticker'
              ? 'text-violet-600 border-b-2 border-violet-500 bg-violet-50/50'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          3ad Stickers
        </button>
      </div>

      {activeTab === 'sticker' ? (
        <StickerPicker
          isOpen={true}
          onToggle={onToggle}
          onStickerSelect={(sticker) => {
            onStickerSelect?.(sticker);
          }}
          className="relative rounded-none shadow-none border-0 w-full max-w-none"
        />
      ) : (
        // Affichage de tous les groupes d'émojis dans une seule zone scrollable
        <div className="flex-1 max-h-[280px] h-[280px] overflow-y-auto px-1 py-2 custom-scrollbar scroll-smooth">
          {categoryEntries.map(([key, category]) => {
            const IconComponent = category.icon;
            return (
              <section key={key} className="mb-2">
                {/* En-tête du groupe */}
                <div className={`sticky top-0 z-10 flex items-center gap-2 px-3 py-1.5 bg-white/95 backdrop-blur-sm border-b border-gray-50 ${category.softAccent}`} style={{borderRadius: 10}}>
                  <IconComponent size={16} className={category.accent} />
                  <span className="text-[11px] font-bold uppercase tracking-widest truncate">
                    {category.label}
                  </span>
                  <span className="ml-auto text-[10px] text-slate-400 shrink-0">
                    {category.emojis.length}
                  </span>
                </div>
                {/* Grille d'émojis du groupe */}
                <div className="grid grid-cols-7 sm:grid-cols-8 gap-y-3 gap-x-1 justify-items-center px-1 py-2">
                  {category.emojis.map((emoji, index) => {
                    const isText = isTextEntry(emoji);
                    return (
                      <button
                        key={`${key}-${emoji}-${index}`}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEmojiSelect(emoji);
                        }}
                        className={isText
                          ? `col-span-4 flex min-h-[36px] w-full items-center justify-center px-3 py-1.5 text-xs sm:text-sm font-medium transition-all duration-200 rounded-xl border border-transparent hover:border-violet-100 hover:bg-violet-50 hover:text-violet-700 hover:shadow-sm active:scale-95 ${emoji.length > 5 ? 'text-[11px]' : ''}`
                          : 'flex h-9 w-9 items-center justify-center text-[22px] transition-all duration-200 rounded-xl hover:bg-slate-100 hover:scale-125 focus:outline-none focus:bg-violet-50 focus:scale-125 active:scale-95'}
                        title={emoji.trim()}
                        dir={/[\u0600-\u06FF]/.test(emoji) ? 'rtl' : undefined}
                      >
                        {emoji.trim()}
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
export default EmojiPicker;
