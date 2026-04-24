import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Users, Settings, WifiOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import ChatInputBar from '@/components/chat/ChatInputBar';
import ConversationMessageBubble from '@/components/conversation/ConversationMessageBubble';
import DateSeparator from '@/components/chat/DateSeparator';
import { groupMessagesByDate } from '@/utils/dateUtils';
import GroupInfoDialog from '@/components/groups/GroupInfoDialog';
import { useCachedDiscussionMessages } from '@/message-cache';
import { useOfflineSync } from '@/offline/hooks/useOfflineSync';

const DiscussionGroupChat = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isOnline } = useOfflineSync();

  const [group, setGroup] = useState<any>(null);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Hook offline-first : messages cachés affichés instantanément, sync en parallèle
  const {
    messages,
    isInitialLoading,
    hasCachedData,
    appendOptimistic,
    upsertMessage,
    removeMessage,
  } = useCachedDiscussionMessages(groupId);

  // Charger les infos du groupe (léger, peut afficher null en attendant)
  useEffect(() => {
    if (!groupId) return;
    let cancelled = false;
    supabase
      .from('discussion_groups')
      .select('*')
      .eq('id', groupId)
      .single()
      .then(({ data }) => {
        if (!cancelled) setGroup(data);
      });
    return () => {
      cancelled = true;
    };
  }, [groupId]);

  // Abonnement realtime aux nouveaux messages du groupe
  useEffect(() => {
    if (!groupId) return;

    const channel = supabase
      .channel(`discussion-messages-${groupId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'discussion_messages',
          filter: `discussion_id=eq.${groupId}`,
        },
        async (payload) => {
          const { data: senderProfile } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, username, avatar_url')
            .eq('id', payload.new.sender_id)
            .single();

          upsertMessage({ ...payload.new, sender: senderProfile });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, upsertMessage]);

  // Auto-scroll vers le bas à chaque nouveau message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (
    content: string,
    messageType: string = 'TEXT',
    file?: File,
    repliedToMessageId?: string,
  ) => {
    if (!content.trim() && !file) return;
    if (!user?.id || !groupId) return;

    const tempId = `temp-${Date.now()}`;
    const tempMessage = {
      id: tempId,
      discussion_id: groupId,
      sender_id: user.id,
      content: content.trim(),
      message_type: messageType.toUpperCase(),
      created_at: new Date().toISOString(),
      sender: {
        id: user.id,
        first_name: user.user_metadata?.first_name || '',
        last_name: user.user_metadata?.last_name || '',
        username: user.user_metadata?.username || '',
        avatar_url: user.user_metadata?.avatar_url,
      },
    };

    appendOptimistic(tempMessage);
    setReplyingTo(null);

    const { data, error } = await supabase
      .from('discussion_messages')
      .insert({
        discussion_id: groupId,
        sender_id: user.id,
        content: content.trim(),
        message_type: messageType.toUpperCase(),
      })
      .select(`*, sender:profiles(id, first_name, last_name, username, avatar_url)`)
      .single();

    if (error) {
      console.error('Error sending message:', error);
      removeMessage(tempId);
    } else if (data) {
      // Remplace l'optimiste par la version serveur (avec id réel)
      removeMessage(tempId);
      upsertMessage(data);
    }
  };

  const handleReply = (message: any) => {
    setReplyingTo({
      id: message.id,
      content: message.content,
      sender_name: message.sender?.first_name || message.sender?.username || 'Inconnu',
    });
  };

  const groupedMessages = groupMessagesByDate(messages);

  // Spinner uniquement quand on n'a vraiment rien à afficher (premier accès au groupe)
  if (isInitialLoading && !hasCachedData) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(251,113,133,0.26),_transparent_24%),radial-gradient(circle_at_top_right,_rgba(168,85,247,0.22),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(96,165,250,0.24),_transparent_30%),linear-gradient(180deg,#fff7fb_0%,#f6f1ff_46%,#edf6ff_100%)] flex items-center justify-center">
        <div className="text-slate-500">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(251,113,133,0.26),_transparent_24%),radial-gradient(circle_at_top_right,_rgba(168,85,247,0.22),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(96,165,250,0.24),_transparent_30%),linear-gradient(180deg,#fff7fb_0%,#f6f1ff_46%,#edf6ff_100%)] pb-16 md:pb-0">
      <div className="flex flex-1 flex-col min-h-0 bg-white/58 lg:h-full lg:overflow-hidden lg:rounded-[28px] lg:border lg:border-white/60 lg:shadow-[0_24px_60px_rgba(124,58,237,0.10)] lg:backdrop-blur-2xl">
        {/* Header fixe */}
        <div className="sticky top-0 z-10 flex items-center space-x-4 bg-[radial-gradient(circle_at_top_left,rgba(251,113,133,0.34),transparent_34%),radial-gradient(circle_at_top_right,rgba(167,139,250,0.32),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.30),rgba(255,255,255,0.10)),linear-gradient(135deg,#fb7185,#a855f7,#60a5fa)] p-4 text-white">
          <button onClick={() => navigate('/messages')} className="rounded-full p-2 transition hover:bg-white/10 lg:hidden">
            <ArrowLeft size={24} />
          </button>

          <button
            onClick={() => setIsGroupInfoOpen(true)}
            className="-m-2 flex flex-1 items-center space-x-3 rounded-xl p-2 text-left transition hover:bg-white/10"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/15">
              <Users className="h-5 w-5" />
            </div>

            <div>
              <h2 className="font-semibold tracking-tight">{group?.name || 'Groupe'}</h2>
              <p className="text-xs text-white/85">
                {!isOnline ? (
                  <span className="inline-flex items-center gap-1">
                    <WifiOff className="h-3 w-3" /> Hors ligne
                  </span>
                ) : (
                  `${group?.member_count || 0} membres`
                )}
              </p>
            </div>
          </button>

          <button className="rounded-full p-2 transition hover:bg-white/10">
            <Settings className="h-5 w-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top_left,_rgba(251,113,133,0.18),_transparent_26%),radial-gradient(circle_at_top_right,_rgba(168,85,247,0.16),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(96,165,250,0.18),_transparent_28%),linear-gradient(180deg,#fff9fc_0%,#f7f2ff_52%,#eef7ff_100%)] p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <p>Aucun message pour le moment</p>
              <p className="mt-2 text-sm">Envoyez un message pour démarrer la conversation</p>
            </div>
          ) : (
            Object.entries(groupedMessages).map(([date, dateMessages]) => (
              <div key={date} className="space-y-3">
                <DateSeparator date={date} />
                {dateMessages.map((msg: any) => (
                  <ConversationMessageBubble
                    key={msg.id}
                    message={msg}
                    isOwn={msg.sender_id === user?.id}
                    senderName={msg.sender?.first_name || msg.sender?.username || 'Inconnu'}
                    senderAvatar={msg.sender?.avatar_url}
                    onReply={() => handleReply(msg)}
                  />
                ))}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="mt-auto shrink-0 border-t border-white/40 bg-white/70 backdrop-blur-xl p-3 pb-2 lg:p-4 lg:rounded-b-[28px]">
          <ChatInputBar
            onSendMessage={handleSendMessage}
            fixedToViewport={true}
            replyingTo={replyingTo}
            onCancelReply={() => setReplyingTo(null)}
            disabled={false}
            contactName={group?.name || 'Groupe'}
          />
        </div>
      </div>

      <GroupInfoDialog
        open={isGroupInfoOpen}
        onClose={() => setIsGroupInfoOpen(false)}
        group={group}
      />
    </div>
  );
};

export default DiscussionGroupChat;
