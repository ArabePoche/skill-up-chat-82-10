import React from 'react';
import { Crown } from 'lucide-react';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import iconSC from '@/assets/coin-soumboulah-cash.png';
import iconSB from '@/assets/coin-soumboulah-bonus.png';
import iconH from '@/assets/coin-habbah.png';
import type { LiveMessage } from '@/live/lib/userLiveShared';

interface LiveMessageItemProps {
  message: LiveMessage;
  hostId: string;
}

const LiveMessageItem: React.FC<LiveMessageItemProps> = ({ message, hostId }) => {
  const isCreator = message.userId === hostId;

  return (
    <motion.div
      key={message.id}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`flex items-start gap-2 w-max max-w-[100%] rounded-xl px-1.5 py-1 text-sm ${
        message.type === 'gift'
          ? 'bg-gradient-to-r from-pink-500/85 via-fuchsia-500/80 to-amber-500/80 text-white shadow-xl px-3 py-2 backdrop-blur-md'
          : message.type === 'raise_hand'
          ? 'bg-amber-500/20 text-amber-200 backdrop-blur-sm rounded-lg px-3'
          : message.type === 'join'
          ? 'bg-transparent text-white/80 drop-shadow-md'
          : 'bg-transparent text-white drop-shadow-md'
      }`}
    >
      {message.type !== 'join' && (
        <div className="relative shrink-0">
          <Avatar className="h-7 w-7 border-[1.5px] border-white/20 mt-0.5">
            <AvatarImage src={message.userAvatar || ''} />
            <AvatarFallback className="bg-zinc-800 text-[10px]">
              {message.userName?.substring(0, 2).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          {isCreator && (
            <div className="absolute -top-1 -right-1 bg-amber-500 rounded-full p-[2px]">
              <Crown className="h-2.5 w-2.5 text-white" />
            </div>
          )}
        </div>
      )}
      <div className="flex flex-col leading-tight">
        {message.type === 'join' ? (
          <span className="break-words flex items-center gap-1 flex-wrap text-xs text-white/90">
            <span className="font-bold text-white">{message.userName}</span> {message.content}
          </span>
        ) : (
          <>
            <span className="font-bold text-white/[0.85] text-xs flex items-center gap-1">
              {message.userName}
              {isCreator && (
                <span className="inline-flex items-center gap-0.5 bg-amber-500/80 text-white text-[8px] font-bold px-1 py-[1px] rounded-full">
                  <Crown className="h-2 w-2" />
                  Créateur
                </span>
              )}
            </span>
            <span className="break-words flex items-center gap-1.5 flex-wrap font-medium">
              {message.content}
              {message.currency === 'soumboulah_cash' && <span className="inline-flex items-center bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full gap-1.5"><img src={iconSC} alt="SC" className="w-5 h-5 object-contain" /> SC</span>}
              {message.currency === 'habbah' && <span className="inline-flex items-center bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full gap-1.5"><img src={iconH} alt="H" className="w-5 h-5 object-contain" /> H</span>}
              {message.currency === 'soumboulah_bonus' && <span className="inline-flex items-center bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full gap-1.5"><img src={iconSB} alt="SB" className="w-5 h-5 object-contain" /> SB</span>}
            </span>
          </>
        )}
      </div>
    </motion.div>
  );
};

export default LiveMessageItem;