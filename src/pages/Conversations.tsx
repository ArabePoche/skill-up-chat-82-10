import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, CheckCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import ChatInputBar from '@/components/chat/ChatInputBar';
import ConversationMessageBubble from '@/components/conversation/ConversationMessageBubble';
import DateSeparator from '@/components/chat/DateSeparator';
import { groupMessagesByDate } from '@/utils/dateUtils';
import { useOfflineConversations } from '@/offline/hooks/useOfflineConversations';
import { useOfflineSync } from '@/offline/hooks/useOfflineSync';
import { offlineStore } from '@/offline/utils/offlineStore';
import { sendPushNotification } from '@/utils/notificationHelpers';
import { useConversationTyping } from '@/hooks/conversations/useConversationTyping';
import CallButton from '@/call-system/components/CallButton';
import AgoraCallUI from '@/call-system/components/AgoraCallUI';
import TeacherCallModal from '@/components/live-classroom/TeacherCallModal';
import { usePrivateConversationCall } from '@/hooks/conversations/usePrivateConversationCall';
import { getCallLogPresentation, parseCallLogContent } from '@/utils/conversationCallLog';
import { useConversationsList } from '@/hooks/messages/useConversationsList';
import { formatMessageTime } from '@/utils/dateUtils';

const Conversations = () => {
  const { otherUserId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasInitialScrolled = useRef(false);
  const queryClient = useQueryClient();
  const { isOnline } = useOfflineSync();
  const { getOfflineConversationWith } = useOfflineConversations(user?.id);
  const [offlineMessages, setOfflineMessages] = useState<any[]>([]);
  const { isOtherTyping, otherActivityType, emitTyping, emitStopTyping } = useConversationTyping(otherUserId);
  const { data: conversations = [], isLoading: isConversationsLoading } = useConversationsList(true);

  // Récupérer le profil de l'utilisateur courant (pour les notifications)
  const { data: currentUserProfile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, username, avatar_url')
        .eq('id', user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Récupérer les infos de l'autre utilisateur
  const { data: otherUserProfile } = useQuery({
    queryKey: ['profile', otherUserId],
    queryFn: async () => {
      // En mode offline, essayer de récupérer le profil depuis le cache
      if (!isOnline) {
        const cachedProfile = await offlineStore.getProfile(otherUserId!);
        if (cachedProfile) {
          console.log('📦 Using cached profile for', otherUserId);
          return cachedProfile;
        }
        return null;
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, username, avatar_url')
        .eq('id', otherUserId)
        .single();
      
      if (error) throw error;
      
      // Sauvegarder le profil dans le cache pour usage offline
      if (data) {
        await offlineStore.saveProfile(data);
      }
      
      return data;
    },
    enabled: !!otherUserId,
    retry: isOnline ? 3 : 0,
  });

  // Récupérer les messages de cette conversation
  const { data: onlineMessages = [], isLoading } = useQuery({
    queryKey: ['conversation-messages', otherUserId],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // En mode offline, retourner un tableau vide - on utilisera offlineMessages
      if (!isOnline) {
        return [];
      }

      // Récupérer TOUS les messages entre les deux utilisateurs (stories et directs)
      const { data, error } = await supabase
        .from('conversation_messages')
        .select(`
          id,
          content,
          sender_id,
          receiver_id,
          created_at,
          is_story_reply,
          replied_to_message_id,
          is_read,
          is_delivered,
          profiles:sender_id (
            first_name,
            last_name,
            username,
            avatar_url
          ),
          conversation_media (
            id,
            file_url,
            file_type,
            file_name,
            file_size,
            duration_seconds
          )
        `)
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Sauvegarder les messages dans le cache pour usage offline
      if (data && data.length > 0) {
        // Sauvegarder dans le query cache
        const participants = [user.id, otherUserId].sort();
        const conversationKey = participants.join('_');
        await offlineStore.cacheQuery(
          `conversation:${conversationKey}`,
          data,
          1000 * 60 * 60 * 24 * 7 // 7 jours
        );
      }
      
      return data || [];
    },
    enabled: !!user?.id && !!otherUserId && isOnline,
    staleTime: 10000,
    retry: isOnline ? 3 : 0,
  });

  // Realtime subscription pour les nouveaux messages de cette conversation
  useEffect(() => {
    if (!user?.id || !otherUserId || !isOnline) return;

    const channel = supabase
      .channel(`conv-${user.id}-${otherUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversation_messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          const newMsg = payload.new as any;
          if (newMsg?.sender_id === otherUserId) {
            queryClient.invalidateQueries({ queryKey: ['conversation-messages', otherUserId] });
            queryClient.invalidateQueries({ queryKey: ['conversations-list', user.id] });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversation_messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          const newMsg = payload.new as any;
          if (newMsg?.sender_id === otherUserId) {
            queryClient.invalidateQueries({ queryKey: ['conversation-messages', otherUserId] });
            queryClient.invalidateQueries({ queryKey: ['conversations-list', user.id] });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'conversation_messages',
        },
        () => {
          // Pour DELETE, payload.old peut être incomplet avec les filtres
          // On invalide systématiquement pour cette conversation
          queryClient.invalidateQueries({ queryKey: ['conversation-messages', otherUserId] });
          queryClient.invalidateQueries({ queryKey: ['conversations-list', user.id] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversation_messages',
          filter: `sender_id=eq.${user.id}`,
        },
        (payload) => {
          const newMsg = payload.new as any;
          if (newMsg?.receiver_id === otherUserId) {
            queryClient.invalidateQueries({ queryKey: ['conversation-messages', otherUserId] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, otherUserId, isOnline, queryClient]);

  // Charger les messages offline
  useEffect(() => {
    const loadOfflineMessages = async () => {
      if (!isOnline && user?.id && otherUserId) {
        console.log('📵 Loading offline messages...');
        const cached = await getOfflineConversationWith(otherUserId);
        if (cached && cached.length > 0) {
          console.log(`📦 Found ${cached.length} cached messages`);
          setOfflineMessages(cached);
        }
      }
    };
    loadOfflineMessages();
  }, [isOnline, user?.id, otherUserId, getOfflineConversationWith]);

  // Fusionner les messages online et offline
  const messages = isOnline ? onlineMessages : offlineMessages;

  const missedCallNotice = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      const callLog = parseCallLogContent(message?.content);

      if (!callLog) {
        continue;
      }

      const presentation = getCallLogPresentation(callLog, user?.id);
      if (presentation.isMissed) {
        return presentation.title;
      }

      return null;
    }

    return null;
  }, [messages, user?.id]);

  const otherUserName = otherUserProfile 
    ? `${otherUserProfile.first_name || ''} ${otherUserProfile.last_name || ''}`.trim() || otherUserProfile.username || 'Utilisateur'
    : 'Utilisateur';

  const selectedConversationId = useMemo(() => `user-${otherUserId}`, [otherUserId]);

  const {
    activeCall,
    closeActiveCallLocally,
    incomingCall,
    isBusy: isCallBusy,
    outgoingCall,
    acceptCall,
    cancelOutgoingCall,
    endCall,
    rejectCall,
    startCall,
  } = usePrivateConversationCall({
    otherUserId,
    otherUserName,
    isOnline,
  });

  // Envoyer un message
  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, file, fileUrl }: { content: string; file?: File; fileUrl?: string }) => {
      if (!user?.id) throw new Error('Non authentifié');
      
      // En mode offline, sauvegarder localement
      if (!isOnline) {
        const pendingMessage = {
          id: `pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          content,
          sender_id: user.id,
          receiver_id: otherUserId,
          created_at: new Date().toISOString(),
          is_story_reply: false,
          replied_to_message_id: replyingTo?.id || null,
          is_pending: true,
          profiles: {
            first_name: user.user_metadata?.first_name || 'Vous',
            last_name: user.user_metadata?.last_name || '',
            username: user.email?.split('@')[0] || 'user',
            avatar_url: null,
          },
          conversation_media: [],
        };
        
        // Ajouter à la liste locale
        setOfflineMessages(prev => [...prev, pendingMessage]);
        
        // Sauvegarder dans la mutation queue
        await offlineStore.addPendingMutation({
          type: 'generic',
          payload: {
            table: 'conversation_messages',
            operation: 'insert',
            data: {
              story_id: null,
              sender_id: user.id,
              receiver_id: otherUserId,
              content,
              is_story_reply: false,
              replied_to_message_id: replyingTo?.id || null,
            }
          }
        });
        
        toast.info('Message enregistré', {
          description: 'Il sera envoyé automatiquement quand vous serez en ligne'
        });
        
        return;
      }

      // Insérer le message sans story_id (conversation directe)
      const { data: messageData, error: messageError } = await supabase
        .from('conversation_messages')
        .insert({
          story_id: null,
          sender_id: user.id,
          receiver_id: otherUserId,
          content,
          is_story_reply: false,
          replied_to_message_id: replyingTo?.id || null,
        })
        .select('id')
        .single();

      if (messageError) throw messageError;

      // Si un fichier est présent, insérer dans conversation_media
      if (file && fileUrl && messageData) {
        const { error: mediaError } = await supabase
          .from('conversation_media')
          .insert({
            message_id: messageData.id,
            file_url: fileUrl,
            file_type: file.type,
            file_name: file.name,
            file_size: file.size,
          });

        if (mediaError) throw mediaError;
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['conversation-messages', otherUserId] });
      setReplyingTo(null);

      // Envoyer une notification push au destinataire (fire & forget)
      if (otherUserId && user?.id) {
        const senderName = (`${currentUserProfile?.first_name || user.user_metadata?.first_name || ''} ${currentUserProfile?.last_name || user.user_metadata?.last_name || ''}`.trim())
          || currentUserProfile?.username
          || user.user_metadata?.username
          || user.email?.split('@')[0]
          || 'Quelqu\'un';
        const senderAvatar = currentUserProfile?.avatar_url || user.user_metadata?.avatar_url || null;

        sendPushNotification({
          userIds: [otherUserId],
          title: senderName,
          message: variables.content.substring(0, 100),
          type: 'private_chat',
          clickAction: '/messages',
          data: {
            senderId: user.id,
            senderName,
            senderAvatar,
            imageUrl: senderAvatar,
          },
        }).catch(() => { /* silently ignore */ });
      }
    },
    onError: (error) => {
      toast.error('Erreur lors de l\'envoi du message');
      console.error(error);
    },
  });

  // Marquer les messages comme lus à l'ouverture de la conversation
  // (is_delivered est déjà mis à true dans useConversationsList)
  useEffect(() => {
    const markAsRead = async () => {
      if (!user?.id || !otherUserId) return;

      // Marquer comme lu les messages non lus
      await supabase
        .from('conversation_messages')
        .update({ is_read: true })
        .eq('sender_id', otherUserId)
        .eq('receiver_id', user.id)
        .eq('is_read', false);

      // Invalider les queries pour mettre à jour les compteurs et les coches
      queryClient.invalidateQueries({ queryKey: ['conversations-list', user.id] });
      queryClient.invalidateQueries({ queryKey: ['unread-counts', user.id] });
      queryClient.invalidateQueries({ queryKey: ['conversation-messages', otherUserId] });
    };

    markAsRead();
  }, [user?.id, otherUserId, queryClient, messages]);

  // Scroll initial instantané au dernier message
  useEffect(() => {
    if (messages.length > 0 && !hasInitialScrolled.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
      hasInitialScrolled.current = true;
    } else if (hasInitialScrolled.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(251,113,133,0.26),_transparent_24%),radial-gradient(circle_at_top_right,_rgba(168,85,247,0.22),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(96,165,250,0.24),_transparent_30%),linear-gradient(180deg,#fff7fb_0%,#f6f1ff_46%,#edf6ff_100%)] pb-16 md:pt-16 md:pb-0 lg:overflow-hidden">
      <div className="flex min-h-screen flex-col lg:h-[calc(100vh-4rem)] lg:min-h-0 lg:flex-row lg:gap-5 lg:p-5">
        <aside className="hidden lg:flex lg:w-[360px] lg:flex-col lg:overflow-hidden lg:rounded-[28px] lg:border lg:border-white/60 lg:bg-white/55 lg:backdrop-blur-2xl lg:shadow-[0_24px_60px_rgba(124,58,237,0.10)]">
          <div className="border-b border-white/50 bg-[linear-gradient(135deg,rgba(255,255,255,0.68),rgba(255,255,255,0.22)),radial-gradient(circle_at_top_left,rgba(251,113,133,0.18),transparent_52%),radial-gradient(circle_at_bottom_right,rgba(96,165,250,0.18),transparent_48%)] px-5 py-5 text-slate-900">
            <h1 className="text-lg font-semibold tracking-tight text-slate-900">Discussions</h1>
            <p className="mt-1 text-sm text-slate-600">Retrouvez toutes vos conversations privées.</p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isConversationsLoading ? (
              <div className="px-5 py-6 text-sm text-slate-500">Chargement des discussions...</div>
            ) : conversations.length === 0 ? (
              <div className="px-5 py-6 text-sm text-slate-500">Aucune discussion disponible.</div>
            ) : (
              conversations.map((conversation: any) => (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => navigate(`/conversations/${conversation.otherUserId}`)}
                  className={`flex w-full items-center gap-3 border-b border-white/40 px-4 py-3 text-left transition duration-200 hover:bg-white/35 ${
                    conversation.id === selectedConversationId ? 'bg-[linear-gradient(135deg,rgba(99,102,241,0.78),rgba(168,85,247,0.68),rgba(59,130,246,0.62))] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_16px_30px_rgba(139,92,246,0.16)]' : 'bg-transparent text-slate-900'
                  }`}
                >
                  <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full text-lg font-semibold text-white ${
                    conversation.id === selectedConversationId ? 'bg-white/30 ring-1 ring-white/40' : 'bg-[linear-gradient(135deg,#f472b6,#a855f7,#60a5fa)]'
                  }`}>
                    {typeof conversation.avatar === 'string' && (conversation.avatar.startsWith('http') || conversation.avatar.startsWith('data:') || conversation.avatar.startsWith('blob:')) ? (
                      <img
                        src={conversation.avatar}
                        alt={conversation.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span>{conversation.avatar}</span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <h2 className={`truncate text-sm font-semibold ${conversation.id === selectedConversationId ? 'text-white' : 'text-slate-900'}`}>{conversation.name}</h2>
                      <span className={`flex-shrink-0 text-xs ${conversation.id === selectedConversationId ? 'text-violet-100' : 'text-slate-400'}`}>
                        {formatMessageTime(conversation.created_at || new Date())}
                      </span>
                    </div>
                    <div className={`flex items-center gap-1 text-sm ${conversation.id === selectedConversationId ? 'text-white/85' : 'text-slate-600'}`}>
                      {conversation.lastMsgIsOwn && (
                        conversation.lastMsgIsRead ? (
                          <CheckCheck size={14} className={`flex-shrink-0 ${conversation.id === selectedConversationId ? 'text-cyan-100' : 'text-sky-500'}`} />
                        ) : conversation.lastMsgIsDelivered ? (
                          <CheckCheck size={14} className={`flex-shrink-0 ${conversation.id === selectedConversationId ? 'text-white/75' : 'text-slate-400'}`} />
                        ) : (
                          <Check size={14} className={`flex-shrink-0 ${conversation.id === selectedConversationId ? 'text-white/75' : 'text-slate-400'}`} />
                        )
                      )}
                      <p className="truncate">{conversation.lastMessage}</p>
                    </div>
                  </div>

                  {conversation.unread > 0 && (
                    <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#ec4899,#8b5cf6,#3b82f6)] text-xs text-white shadow-sm">
                      {conversation.unread}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col bg-white/58 lg:min-h-0 lg:overflow-hidden lg:rounded-[28px] lg:border lg:border-white/60 lg:shadow-[0_24px_60px_rgba(124,58,237,0.10)] lg:backdrop-blur-2xl">
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center space-x-4 bg-[radial-gradient(circle_at_top_left,rgba(251,113,133,0.34),transparent_34%),radial-gradient(circle_at_top_right,rgba(167,139,250,0.32),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.30),rgba(255,255,255,0.10)),linear-gradient(135deg,#fb7185,#a855f7,#60a5fa)] p-4 text-white md:top-16 lg:top-0 lg:rounded-t-[28px]">
            <button onClick={() => navigate('/messages')} className="rounded-full p-2 transition hover:bg-white/10 lg:hidden">
              <ArrowLeft size={24} />
            </button>
            <button 
              onClick={() => navigate(`/profile/${otherUserId}`)}
              className="-m-2 flex flex-1 items-center space-x-3 rounded-xl p-2 text-left transition hover:bg-white/10"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/15">
                {otherUserProfile?.avatar_url ? (
                  <img src={otherUserProfile.avatar_url} alt={otherUserName} className="w-10 h-10 rounded-full" />
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
                  <p className="text-xs italic text-amber-100">
                    {missedCallNotice}
                  </p>
                ) : isOtherTyping ? (
                  <p className="animate-pulse text-xs italic text-cyan-100">
                    {otherActivityType === 'recording' ? 'est en train d\'enregistrer un vocal...' : 'est en train d\'écrire...'}
                  </p>
                ) : null}
              </div>
            </button>
            <div className="flex items-center gap-2">
              <CallButton
                type="audio"
                onCall={() => startCall('audio')}
                disabled={!isOnline || isCallBusy}
                className="border-white/20 bg-white/12 text-white shadow-sm hover:bg-white/22 hover:text-white"
              />
              <CallButton
                type="video"
                onCall={() => startCall('video')}
                disabled={!isOnline || isCallBusy}
                className="border-white/20 bg-white/12 text-white shadow-sm hover:bg-white/22 hover:text-white"
              />
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top_left,_rgba(251,113,133,0.18),_transparent_26%),radial-gradient(circle_at_top_right,_rgba(168,85,247,0.16),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(96,165,250,0.18),_transparent_28%),linear-gradient(180deg,#fff9fc_0%,#f7f2ff_52%,#eef7ff_100%)] p-4 space-y-3">
            {isLoading ? (
              <div className="text-center text-slate-500">
                {isOnline ? 'Chargement...' : 'Chargement depuis le cache...'}
              </div>
            ) : messages.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                <p>Aucun message pour le moment</p>
                <p className="mt-2 text-sm">
                  {isOnline 
                    ? 'Envoyez un message pour démarrer la conversation'
                    : 'Les messages seront chargés quand vous serez en ligne'}
                </p>
              </div>
            ) : (
              Object.entries(groupMessagesByDate(messages)).map(([date, dateMessages]) => (
                <div key={date} className="space-y-3">
                  <DateSeparator date={date} />
                  {dateMessages.map((msg: any) => (
                    <ConversationMessageBubble 
                      key={msg.id}
                      message={msg} 
                      onReply={(message) => setReplyingTo(message)}
                    />
                  ))}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input - Réutilisation de ChatInputBar */}
          <div className="border-t border-white/50 bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(255,255,255,0.56))] p-4 lg:rounded-b-[28px]">
            {replyingTo && (
              <div className="mb-2 flex items-center justify-between rounded-2xl border border-white/60 bg-white/55 px-3 py-2 backdrop-blur-sm">
                <div className="text-sm">
                  <span className="font-semibold text-violet-700">Répondre à:</span>
                  <p className="truncate text-slate-600">{replyingTo.content}</p>
                </div>
                <button 
                  onClick={() => setReplyingTo(null)}
                  className="text-slate-500 transition hover:text-slate-800"
                >
                  ✕
                </button>
              </div>
            )}
            <ChatInputBar
              onSendMessage={(content, messageType, file) => {
                if (content.trim() || file) {
                  emitStopTyping();
                  const fileUrl = file && (file as any).uploadUrl;
                  sendMessageMutation.mutate({ 
                    content, 
                    file, 
                    fileUrl 
                  });
                }
              }}
              onTyping={emitTyping}
              disabled={sendMessageMutation.isPending}
            />
          </div>
        </div>
      </div>

      {incomingCall && (
        <TeacherCallModal
          isOpen={true}
          onAccept={async () => {
            await acceptCall();
          }}
          onReject={async () => {
            await rejectCall();
          }}
          studentName={otherUserName}
          studentAvatar={otherUserProfile?.avatar_url}
          callType={incomingCall.callType}
        />
      )}

      {outgoingCall && (
        <TeacherCallModal
          isOpen={true}
          onAccept={async () => {}}
          onReject={async () => {
            await cancelOutgoingCall();
          }}
          studentName={otherUserName}
          studentAvatar={otherUserProfile?.avatar_url}
          callType={outgoingCall.callType}
          direction="outgoing"
        />
      )}

      {activeCall && (
        <AgoraCallUI
          key={activeCall.id}
          callId={activeCall.id}
          channelName={activeCall.channelName}
          callType={activeCall.callType}
          remoteUserName={activeCall.remoteUserName}
          remoteUserAvatar={otherUserProfile?.avatar_url || undefined}
          localUserAvatar={currentUserProfile?.avatar_url || user?.user_metadata?.avatar_url || undefined}
          onEndCall={endCall}
          onRemoteEndCall={closeActiveCallLocally}
        />
      )}
    </div>
  );
};

export default Conversations;
