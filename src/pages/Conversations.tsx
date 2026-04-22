import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useOfflineConversations } from '@/offline/hooks/useOfflineConversations';
import { useOfflineSync } from '@/offline/hooks/useOfflineSync';
import { offlineStore } from '@/offline/utils/offlineStore';
import { sendPushNotification } from '@/utils/notificationHelpers';
import { useConversationTyping } from '@/hooks/conversations/useConversationTyping';
import AgoraCallUI from '@/call-system/components/AgoraCallUI';
import TeacherCallModal from '@/components/live-classroom/TeacherCallModal';
import { usePrivateConversationCall } from '@/hooks/conversations/usePrivateConversationCall';
import { getCallLogPresentation, parseCallLogContent } from '@/utils/conversationCallLog';
import { useConversationsList } from '@/hooks/messages/useConversationsList';
import ConversationsDesktopSidebar from '@/conversations/components/desktop/ConversationsDesktopSidebar';
import ConversationDiscussionPanel from '@/conversations/components/desktop/ConversationDiscussionPanel';
import ConversationsDesktopStoriesBar from '../conversations/components/desktop/ConversationsDesktopStoriesBar';
import { useConversationForwardDialog } from '@/conversations/ConversationForwardDialogProvider';

const Conversations = () => {
  const { otherUserId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasInitialScrolled = useRef(false);
  const queryClient = useQueryClient();
  const { isOnline } = useOfflineSync();
  const { openConversationForward } = useConversationForwardDialog();
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
          replied_to_message:replied_to_message_id(
            id,
            content,
            sender_id,
            profiles:sender_id(
              first_name,
              last_name,
              username
            ),
            conversation_media(
              id,
              file_type,
              file_name
            )
          ),
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
        try {
          const cached = await getOfflineConversationWith(otherUserId);
          if (cached && cached.length > 0) {
            console.log(`📦 Found ${cached.length} cached messages`);
            setOfflineMessages(cached);
          } else {
            console.log('⚠️ No cached messages found, trying alternative cache key...');
            // Essayer aussi avec la clé inversée
            const participants = [user.id, otherUserId].sort();
            const conversationKey = participants.join('_');
            const alternativeCached = await offlineStore.getCachedQuery(`conversation:${conversationKey}`);
            if (alternativeCached && alternativeCached.length > 0) {
              console.log(`📦 Found ${alternativeCached.length} cached messages (alternative key)`);
              setOfflineMessages(alternativeCached);
            } else {
              console.log('⚠️ No cached messages found with alternative key');
              setOfflineMessages([]);
            }
          }
        } catch (error) {
          console.error('❌ Error loading offline messages:', error);
          setOfflineMessages([]);
        }
      } else if (isOnline) {
        // Réinitialiser les messages offline quand on revient en ligne
        setOfflineMessages([]);
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

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;

    const query = searchQuery.toLowerCase().trim();
    return conversations.filter((conversation: any) =>
      conversation.name?.toLowerCase().includes(query)
      || conversation.lastMessage?.toLowerCase().includes(query),
    );
  }, [conversations, searchQuery]);

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
    mutationFn: async ({ content, file, fileUrl, repliedToMessageId }: { content: string; file?: File; fileUrl?: string; repliedToMessageId?: string }) => {
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
          replied_to_message_id: repliedToMessageId || replyingTo?.id || null,
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
              replied_to_message_id: repliedToMessageId || replyingTo?.id || null,
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
          replied_to_message_id: repliedToMessageId || replyingTo?.id || null,
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
    onSuccess: async (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['conversation-messages', otherUserId] });
      setReplyingTo(null);

      // Sauvegarder les messages dans le cache offline après l'envoi
      if (user?.id && otherUserId) {
        try {
          const { data: allMessages } = await supabase
            .from('conversation_messages')
            .select('*')
            .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
            .order('created_at', { ascending: false })
            .limit(500);
          
          if (allMessages && allMessages.length > 0) {
            const participants = [user.id, otherUserId].sort();
            const conversationKey = participants.join('_');
            await offlineStore.cacheQuery(
              `conversation:${conversationKey}`,
              allMessages,
              1000 * 60 * 60 * 24 * 7 // 7 jours
            );
            console.log('✅ Messages sauvegardés dans le cache offline après envoi');
          }
        } catch (error) {
          console.error('❌ Erreur sauvegarde messages offline après envoi:', error);
        }
      }

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

  const handleScrollToMessage = (messageId: string) => {
    const element = document.getElementById(`message-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMessageId(messageId);
      setTimeout(() => setHighlightedMessageId(null), 2000);
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-[radial-gradient(circle_at_top_left,_rgba(251,113,133,0.26),_transparent_24%),radial-gradient(circle_at_top_right,_rgba(168,85,247,0.22),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(96,165,250,0.24),_transparent_30%),linear-gradient(180deg,#fff7fb_0%,#f6f1ff_46%,#edf6ff_100%)] pb-0 md:pt-16 lg:h-screen lg:max-h-screen lg:min-h-0 lg:flex lg:flex-col lg:pt-0 lg:overflow-hidden">
      <div className="flex flex-col flex-1 min-h-0 lg:h-full lg:overflow-hidden lg:px-5 lg:pt-0 lg:pb-0">
        <div className="hidden lg:block lg:shrink-0">
          <ConversationsDesktopStoriesBar />
        </div>

        <div className="hidden lg:flex lg:min-h-0 lg:flex-1 lg:gap-5">
          <ConversationsDesktopSidebar
            conversations={filteredConversations}
            isLoading={isConversationsLoading}
            searchQuery={searchQuery}
            selectedConversationId={selectedConversationId}
            onSearchChange={setSearchQuery}
            onSelectConversation={(targetOtherUserId) => navigate(`/conversations/${targetOtherUserId}`)}
          />

          <ConversationDiscussionPanel
            otherUserId={otherUserId}
            otherUserName={otherUserName}
            otherUserAvatarUrl={otherUserProfile?.avatar_url}
            activeCall={activeCall}
            outgoingCall={outgoingCall}
            missedCallNotice={missedCallNotice}
            isOtherTyping={isOtherTyping}
            otherActivityType={otherActivityType}
            isOnline={isOnline}
            isCallBusy={isCallBusy}
            isLoading={isLoading}
            messages={messages}
            replyingTo={replyingTo}
            messagesEndRef={messagesEndRef}
            onBack={() => navigate('/messages')}
            onOpenProfile={() => navigate(`/profile/${otherUserId}`)}
            onStartAudioCall={() => startCall('audio')}
            onStartVideoCall={() => startCall('video')}
            onReply={setReplyingTo}
            onForward={(message) =>
              openConversationForward(message, {
                extraExcludedUserIds: otherUserId ? [otherUserId] : [],
              })
            }
            onClearReply={() => setReplyingTo(null)}
            onScrollToMessage={handleScrollToMessage}
            highlightedMessageId={highlightedMessageId}
            onSendMessage={(content, _messageType, file, repliedToMessageId) => {
              if (content.trim() || file) {
                emitStopTyping();
                const fileUrl = file && (file as any).uploadUrl;
                sendMessageMutation.mutate({
                  content,
                  file,
                  fileUrl,
                  repliedToMessageId,
                });
              }
            }}
            onTyping={emitTyping}
            disabled={sendMessageMutation.isPending}
          />
        </div>

        <div className="flex flex-1 flex-col lg:hidden min-h-0">
          <ConversationDiscussionPanel
            otherUserId={otherUserId}
            otherUserName={otherUserName}
            otherUserAvatarUrl={otherUserProfile?.avatar_url}
            activeCall={activeCall}
            outgoingCall={outgoingCall}
            missedCallNotice={missedCallNotice}
            isOtherTyping={isOtherTyping}
            otherActivityType={otherActivityType}
            isOnline={isOnline}
            isCallBusy={isCallBusy}
            isLoading={isLoading}
            messages={messages}
            replyingTo={replyingTo}
            messagesEndRef={messagesEndRef}
            onBack={() => navigate('/messages')}
            onOpenProfile={() => navigate(`/profile/${otherUserId}`)}
            onStartAudioCall={() => startCall('audio')}
            onStartVideoCall={() => startCall('video')}
            onReply={setReplyingTo}
            onForward={(message) =>
              openConversationForward(message, {
                extraExcludedUserIds: otherUserId ? [otherUserId] : [],
              })
            }
            onClearReply={() => setReplyingTo(null)}
            onScrollToMessage={handleScrollToMessage}
            highlightedMessageId={highlightedMessageId}
            onSendMessage={(content, _messageType, file, repliedToMessageId) => {
              if (content.trim() || file) {
                emitStopTyping();
                const fileUrl = file && (file as any).uploadUrl;
                sendMessageMutation.mutate({
                  content,
                  file,
                  fileUrl,
                  repliedToMessageId,
                });
              }
            }}
            onTyping={emitTyping}
            disabled={sendMessageMutation.isPending}
          />
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
