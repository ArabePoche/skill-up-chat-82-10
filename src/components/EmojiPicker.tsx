
import React, { useState, useEffect, useRef } from 'react';
import { Smile, Heart, Sun, Coffee, Car, Flag, Music, Star } from 'lucide-react';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const EmojiPicker: React.FC<EmojiPickerProps> = ({ onEmojiSelect, isOpen, onToggle }) => {
  const [activeCategory, setActiveCategory] = useState('smileys');
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        onToggle();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onToggle]);

  const emojiCategories = {
    smileys: {
      icon: Smile,
      emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '🤔',' 🤗', '🤫', '🫢', '🤕' ]
    },
    emotions: {
      icon: Heart,
      emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '♥️', '💯', '💢', '💥', '💫', '💦', '💨', '🕳️', '💣', '💬', '👁️‍🗨️', '🗨️', '🗯️', '💭']
    },
    nature: {
      icon: Sun,
      emojis: ['🌞', '🌝', '🌛', '🌜', '🌚', '🌕', '🌖', '🌗', '🌘', '🌑', '🌒', '🌓', '🌔', '🌙', '⭐', '🌟', '💫', '✨', '☄️', '☀️', '🌤️', '⛅', '🌥️', '☁️', '🌦️', '🌧️', '⛈️', '🌩️', '🌨️', '❄️', '☃️', '⛄']
    },
    food: {
      icon: Coffee,
      emojis: ['🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🌽', '🥕', '🧄', '🧅', '🥔', '🍠', '🥐', '🍞', '🥖', '🥨', '🧀']
    },
    transport: {
      icon: Car,
      emojis: ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🏍️', '🛵', '🚲', '🛴', '🛹', '🚁', '🛸', '✈️', '🛩️', '🛫', '🛬', '🚀', '🛰️', '💺', '🚢', '⛵', '🛶', '🚤']
    },
    flags: {
      icon: Flag,
      emojis: ['🏁', '🚩', '🎌', '🏴', '🏳️', '🇧🇫', '🏳️‍🌈', '🏳️‍⚧️', '🇬🇳', '🇫🇷', '🇺🇸', '🇬🇧', '🇩🇪', '🇪🇸', '🇮🇹', '🇯🇵', '🇨🇳', '🇲🇱', '🇨🇲', '🇰🇷', '🇷🇺', '🇧🇷', '🇨🇦', '🇦🇺', '🇮🇳', '🇲🇽', '🇳🇱', '🇸🇪', '🇳🇴', '🇩🇰', '🇫🇮', '🇵🇱', '🇨🇭', '🇦🇹']
    },
    music: {
      icon: Music,
      emojis: ['🎵', '🎶', '🎼', '🎤', '🎧', '📻', '🎙️', '📢', '📣', '📯', '🔔', '🔕', '🎚️', '🎛️', '🎨', '🖌️', '🖍️', '🖊️', '🖋️', '✏️', '✒️', '🖇️', '📎', '🔗']
    },
    symbols: {
      icon: Star,
      emojis: ['⭐', '🌟', '💫', '✨', '🔥', '💥', '💢', '💯', '💢', '💥', '💫', '💦', '💨', '🕳️', '💣', '💬', '👁️‍🗨️', '🗨️', '🗯️', '💭', '💤', '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '👍',  '✍️', '🤝', '💪', '👆', '👇', '👏', '🤲', '🫶', '👂', '👀' ]
    }
  };

  if (!isOpen) return null;

  const handleEmojiSelect = (emoji: string) => {
    onEmojiSelect(emoji);
    onToggle();
  };

  return (
    <div ref={pickerRef} className="bg-white border border-gray-200 rounded-lg shadow-lg w-80 max-h-72">
      {/* Categories */}
      <div className="flex border-b border-gray-200 bg-gray-50 rounded-t-lg">
        {Object.entries(emojiCategories).map(([key, category]) => {
          const IconComponent = category.icon;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveCategory(key)}
              className={`flex-1 p-2 text-center hover:bg-gray-100 first:rounded-tl-lg last:rounded-tr-lg ${
                activeCategory === key ? 'bg-blue-100 text-blue-600' : 'text-gray-600'
              }`}
            >
              <IconComponent size={16} className="mx-auto" />
            </button>
          );
        })}
      </div>
      
      {/* Emojis Grid */}
      <div className="p-3 max-h-48 overflow-y-auto">
        <div className="grid grid-cols-8 gap-1">
          {emojiCategories[activeCategory as keyof typeof emojiCategories].emojis.map((emoji, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleEmojiSelect(emoji)}
              className="w-8 h-8 flex items-center justify-center text-lg hover:bg-gray-100 rounded transition-colors"
              title={emoji}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EmojiPicker;
