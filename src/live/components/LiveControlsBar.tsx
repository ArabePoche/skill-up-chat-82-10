import React from 'react';
import { BookOpen, Gift, Hand, Mic, MicOff, RefreshCw, Send, Share2, Users, Video, VideoOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LiveControlsBarProps {
  isHost: boolean;
  isAcceptedParticipant: boolean;
  hasRaisedHand: boolean;
  messageInput: string;
  onMessageInputChange: (value: string) => void;
  onSendMessage: () => void;
  onRaiseHand: () => void;
  onSendGift: () => void;
  onOpenScreenManager: () => void;
  onOpenRegistrants: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onSwitchCamera: () => void;
  hasPaidEntry: boolean;
  isMuted: boolean;
  isVideoEnabled: boolean;
}

const LiveControlsBar: React.FC<LiveControlsBarProps> = ({
  isHost,
  isAcceptedParticipant,
  hasRaisedHand,
  messageInput,
  onMessageInputChange,
  onSendMessage,
  onRaiseHand,
  onSendGift,
  onOpenScreenManager,
  onOpenRegistrants,
  onToggleMute,
  onToggleVideo,
  onSwitchCamera,
  hasPaidEntry,
  isMuted,
  isVideoEnabled,
}) => {
  const handleShare = () => {
    try {
      if (navigator.share) {
        void navigator.share({
          title: 'Rejoignez mon live!',
          url: window.location.href,
        });
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex h-[42px] flex-1 items-center rounded-full bg-black/20 border border-white/10 px-4 text-white backdrop-blur-md">
        <input
          type="text"
          placeholder={isHost ? 'Message aux spectateurs...' : 'Ajouter un commentaire...'}
          value={messageInput}
          onChange={(event) => onMessageInputChange(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && onSendMessage()}
          className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-zinc-400"
        />
        <button
          className="ml-2 flex items-center justify-center rounded-full bg-indigo-600 p-2 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
          onClick={onSendMessage}
          disabled={!messageInput.trim()}
        >
          <Send className="h-4 w-4" />
        </button>
      </div>

      {!isHost && (
        <>
          {!isAcceptedParticipant && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className={`h-11 w-11 rounded-full border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white transition-all ${
                hasRaisedHand ? 'bg-amber-500/30 border-amber-400/50 animate-pulse' : ''
              }`}
              onClick={onRaiseHand}
              disabled={hasRaisedHand}
              title="Demander à intervenir"
            >
              <Hand size={20} className={hasRaisedHand ? 'text-amber-400' : ''} />
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-11 w-11 rounded-full border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
            onClick={onSendGift}
          >
            <Gift size={20} className="text-pink-500" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-11 w-11 rounded-full border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
            onClick={handleShare}
          >
            <Share2 size={20} />
          </Button>
        </>
      )}

      {(isHost || isAcceptedParticipant) && (
        <>
          {isHost && (
            <Button
              type="button"
              onClick={onOpenScreenManager}
              variant="outline"
              size="icon"
              className="h-11 w-11 shrink-0 rounded-full border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
              title="Piloter les écrans du live"
            >
              <BookOpen size={18} />
            </Button>
          )}
          {isHost && hasPaidEntry && (
            <Button
              type="button"
              onClick={onOpenRegistrants}
              variant="outline"
              size="icon"
              className="h-11 w-11 shrink-0 rounded-full border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
              title="Inscrits et revenus"
            >
              <Users size={18} />
            </Button>
          )}
          <Button
            type="button"
            onClick={onToggleMute}
            variant={isMuted ? 'destructive' : 'outline'}
            size="icon"
            className="h-11 w-11 shrink-0 rounded-full border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
          >
            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </Button>
          <Button
            type="button"
            onClick={onToggleVideo}
            variant={!isVideoEnabled ? 'destructive' : 'outline'}
            size="icon"
            className="h-11 w-11 shrink-0 rounded-full border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
          >
            {isVideoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
          </Button>
          <Button
            type="button"
            onClick={onSwitchCamera}
            variant="outline"
            size="icon"
            className="h-11 w-11 shrink-0 rounded-full border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
            title="Basculer entre caméra avant et arrière"
          >
            <RefreshCw size={18} />
          </Button>
        </>
      )}
    </div>
  );
};

export default LiveControlsBar;