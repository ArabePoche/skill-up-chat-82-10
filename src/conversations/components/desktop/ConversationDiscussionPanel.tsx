/* Panneau d'affichage de la conversation privee avec header, messages et saisie. */
import React from 'react';
import { ArrowLeft } from 'lucide-react';
import ChatInputBar from '@/components/chat/ChatInputBar';
import ConversationMessageBubble from '@/components/conversation/ConversationMessageBubble';
import DateSeparator from '@/components/chat/DateSeparator';
import CallButton from '@/call-system/components/CallButton';
import { groupMessagesByDate } from '@/utils/dateUtils';
import { getForwardedMessagePreview } from '@/utils/forwardedConversationMessage';

interface ConversationDiscussionPanelProps {
  otherUserId?: string;
  otherUserName: string;
  otherUserAvatarUrl?: string | null;
  activeCall: unknown;
  outgoingCall: { callType: 'audio' | 'video' } | null;
  missedCallNotice: string | null;
  isOtherTyping: boolean;
  otherActivityType?: string | null;
  isOnline: boolean;
  isCallBusy: boolean;
  isLoading: boolean;
  messages: any[];
  replyingTo: any;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onBack: () => void;
  onOpenProfile: () => void;
  onStartAudioCall: () => Promise<boolean>;
  onStartVideoCall: () => Promise<boolean>;
  onReply: (message: any) => void;
  onForward: (message: any) => void;
  onClearReply: () => void;
  onSendMessage: (content: string, messageType: string, file?: File, repliedToMessageId?: string) => void;
  onTyping: () => void;
  onScrollToMessage?: (messageId: string) => void;
  highlightedMessageId?: string | null;
  disabled: boolean;
}

const ConversationDiscussionPanel = ({
  otherUserId,
  otherUserName,
  otherUserAvatarUrl,
  activeCall,
  outgoingCall,
  missedCallNotice,
  isOtherTyping,
  otherActivityType,
  isOnline,
  isCallBusy,
  isLoading,
  messages,
  replyingTo,
  messagesEndRef,
  onBack,
  onOpenProfile,
  onStartAudioCall,
  onStartVideoCall,
  onReply,
  onForward,
  onClearReply,
  onSendMessage,
  onTyping,
  onScrollToMessage,
  highlightedMessageId,
  disabled,
}: ConversationDiscussionPanelProps) => {
  return (
    <div className="flex flex-1 flex-col min-h-0 bg-white/58 lg:h-full lg:overflow-hidden lg:rounded-[28px] lg:border lg:border-white/60 lg:shadow-[0_24px_60px_rgba(124,58,237,0.10)] lg:backdrop-blur-2xl">
      <div className="sticky top-0 z-10 flex items-center space-x-4 bg-[radial-gradient(circle_at_top_left,rgba(251,113,133,0.34),transparent_34%),radial-gradient(circle_at_top_right,rgba(167,139,250,0.32),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.30),rgba(255,255,255,0.10)),linear-gradient(135deg,#fb7185,#a855f7,#60a5fa)] p-4 text-white md:top-16 lg:top-0 lg:rounded-t-[28px]">
        <button onClick={onBack} className="rounded-full p-2 transition hover:bg-white/10 lg:hidden">
          <ArrowLeft size={24} />
        </button>

        <button
          onClick={onOpenProfile}
          className="-m-2 flex flex-1 items-center space-x-3 rounded-xl p-2 text-left transition hover:bg-white/10"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/15">
            {otherUserAvatarUrl ? (
              <img src={otherUserAvatarUrl} alt={otherUserName} className="h-10 w-10 rounded-full" />
            ) : (
              <span className="text-lg font-semibold">{otherUserName[0]?.toUpperCase()}</span>
            )}
          </div>

          <div>
            <h2 className="font-semibold tracking-tight">{otherUserName}</h2>
            {activeCall ? (
              <p className="text-xs italic text-white/85">appel en cours...</p>
            ) : outgoingCall ? (
              <p className="animate-pulse text-xs italic text-white/85">
                appel {outgoingCall.callType === 'video' ? 'video' : 'audio'} en attente...
              </p>
            ) : missedCallNotice ? (
              <p className="text-xs italic text-amber-100">{missedCallNotice}</p>
            ) : isOtherTyping ? (
              <p className="animate-pulse text-xs italic text-cyan-100">
                {otherActivityType === 'recording' ? 'est en train d\'enregistrer un vocal...' : 'est en train d\'ecrire...'}
              </p>
            ) : null}
          </div>
        </button>

        <div className="flex items-center gap-2">
          <CallButton
            type="audio"
            onCall={() => onStartAudioCall()}
            disabled={!isOnline || isCallBusy}
            className="border-white/20 bg-white/12 text-white shadow-sm hover:bg-white/22 hover:text-white"
          />
          <CallButton
            type="video"
            onCall={() => onStartVideoCall()}
            disabled={!isOnline || isCallBusy}
            className="border-white/20 bg-white/12 text-white shadow-sm hover:bg-white/22 hover:text-white"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top_left,_rgba(251,113,133,0.18),_transparent_26%),radial-gradient(circle_at_top_right,_rgba(168,85,247,0.16),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(96,165,250,0.18),_transparent_28%),linear-gradient(180deg,#fff9fc_0%,#f7f2ff_52%,#eef7ff_100%)] p-4 space-y-3">
        {isLoading ? (
          <div className="text-center text-slate-500">
            {isOnline ? 'Chargement...' : 'Chargement depuis le cache...'}
          </div>
        ) : messages.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            <p>Aucun message pour le moment</p>
            <p className="mt-2 text-sm">
              {isOnline
                ? 'Envoyez un message pour demarrer la conversation'
                : 'Les messages seront charges quand vous serez en ligne'}
            </p>
          </div>
        ) : (
          Object.entries(groupMessagesByDate(messages)).map(([date, dateMessages]) => (
            <div key={date} className="space-y-3">
              <DateSeparator date={date} />
              {dateMessages.map((message: any) => (
                <ConversationMessageBubble
                  key={message.id}
                  message={message}
                  onReply={onReply}
                  onForward={onForward}
                  onScrollToMessage={onScrollToMessage}
                  highlightedMessageId={highlightedMessageId}
                />
              ))}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="mt-auto shrink-0 border-t border-white/40 bg-white/70 backdrop-blur-xl p-3 pb-[env(safe-area-inset-bottom,12px)] lg:p-4 lg:rounded-b-[28px]">
        <ChatInputBar
          onSendMessage={onSendMessage}
          onTyping={onTyping}
          disabled={disabled}
          fixedToViewport={false}
          replyingTo={replyingTo ? (() => {
            let previewContent = replyingTo.content;
            const media = (replyingTo.conversation_media || replyingTo.lesson_media)?.[0];
            
            if (media && !previewContent) {
              const type = media.file_type || '';
              if (type.startsWith('image/')) previewContent = '📷 Photo';
              else if (type.startsWith('video/')) previewContent = '🎥 Vidéo';
              else if (type.startsWith('audio/')) previewContent = '🎤 Message vocal';
              else previewContent = '📄 Fichier joint';
            }
            
            return {
              id: replyingTo.id,
              content: previewContent || 'Message',
              sender_name: replyingTo.profiles?.first_name 
                ? `${replyingTo.profiles.first_name} ${replyingTo.profiles.last_name || ''}`.trim() 
                : replyingTo.profiles?.username || 'Utilisateur'
            };
          })() : null}
          onCancelReply={onClearReply}
          onScrollToMessage={onScrollToMessage}
        />
      </div>
    </div>
  );
};

export default ConversationDiscussionPanel;