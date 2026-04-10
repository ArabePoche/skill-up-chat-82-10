import React from 'react';
import { Send, Gift, Hand } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import type { LiveMessage } from '../utils/types';

interface LiveChatPanelProps {
  messages: LiveMessage[];
  messageInput: string;
  setMessageInput: (val: string) => void;
  onSendMessage: () => void;
  onGiftClick: () => void;
  onRaiseHand: () => void;
  hasRaisedHand: boolean;
  isHost: boolean;
  isAcceptedParticipant: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  commentsScrollRef: React.RefObject<HTMLDivElement>;
  areCommentsCollapsed: boolean;
  setAreCommentsCollapsed: (val: boolean) => void;
}

export const LiveChatPanel: React.FC<LiveChatPanelProps> = ({
  messages,
  messageInput,
  setMessageInput,
  onSendMessage,
  onGiftClick,
  onRaiseHand,
  hasRaisedHand,
  isHost,
  isAcceptedParticipant,
  messagesEndRef,
  commentsScrollRef,
  areCommentsCollapsed,
  setAreCommentsCollapsed,
}) => {
  return (
    <div className="absolute bottom-0 left-0 right-0 z-40 p-4 pb-6 flex flex-col gap-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none">
      {/* Liste des messages */}
      <div 
        ref={commentsScrollRef}
        className={`flex flex-col gap-2 max-h-[35vh] overflow-y-auto scrollbar-none transition-all duration-300 pointer-events-auto ${areCommentsCollapsed ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'}`}
      >
        <div className="flex-1" />
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-start gap-2 max-w-[85%]"
          >
            <Avatar className="h-6 w-6 shrink-0 border border-white/10">
              <AvatarImage src={msg.userAvatar || ''} />
              <AvatarFallback className="bg-zinc-800 text-[10px] text-white">
                {msg.userName.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className={`rounded-2xl px-3 py-1.5 text-xs shadow-sm ${msg.type === 'gift' ? 'bg-pink-500/20 text-pink-100 border border-pink-500/30' : msg.type === 'raise_hand' ? 'bg-blue-500/20 text-blue-100 border border-blue-500/30' : 'bg-black/40 text-white backdrop-blur-md border border-white/5'}`}>
              <span className="font-bold mr-1.5 opacity-90">{msg.userName}</span>
              <span className="opacity-95">{msg.content}</span>
            </div>
          </motion.div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Barre d'input et actions */}
      <div className="flex items-center gap-2 pointer-events-auto">
        <div className="relative flex-1 group">
          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSendMessage()}
            placeholder="Envoyer un message..."
            className="w-full bg-black/40 border border-white/10 rounded-full py-2.5 pl-4 pr-12 text-sm text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500/50 backdrop-blur-md transition-all group-hover:bg-black/50"
          />
          <Button
            size="icon"
            onClick={onSendMessage}
            disabled={!messageInput.trim()}
            className="absolute right-1 top-1 h-8 w-8 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-lg transition-transform active:scale-95 disabled:opacity-50 disabled:scale-100"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {!isHost && !isAcceptedParticipant && (
          <Button
            size="icon"
            onClick={onRaiseHand}
            disabled={hasRaisedHand}
            className={`h-10 w-10 rounded-full shadow-lg transition-all active:scale-90 border border-white/10 backdrop-blur-md ${hasRaisedHand ? 'bg-blue-600/80 text-white' : 'bg-black/40 text-white hover:bg-blue-600/40'}`}
            title="Demander à intervenir"
          >
            <Hand className={`h-5 w-5 ${hasRaisedHand ? 'animate-bounce' : ''}`} />
          </Button>
        )}

        {!isHost && (
          <Button
            size="icon"
            onClick={onGiftClick}
            className="h-10 w-10 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-lg transition-all hover:scale-110 active:scale-90 border border-white/20"
            title="Envoyer un cadeau"
          >
            <Gift className="h-5 w-5" />
          </Button>
        )}
      </div>
    </div>
  );
};
