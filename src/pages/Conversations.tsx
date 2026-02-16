import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import ChatInputBar from '@/components/chat/ChatInputBar';
import ConversationMessageBubble from '@/components/conversation/ConversationMessageBubble';
import { useOfflineConversations } from '@/offline/hooks/useOfflineConversations';
import { useOfflineSync } from '@/offline/hooks/useOfflineSync';
import { offlineStore } from '@/offline/utils/offlineStore';
import { sendPushNotification } from '@/utils/notificationHelpers';

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
    staleTime: 30000, // Cache pendant 30 secondes
    refetchInterval: false, // Désactivé - utiliser Realtime subscriptions
    retry: isOnline ? 3 : 0,
  });

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
        const senderName = otherUserProfile
          ? `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() || user.email || 'Quelqu\'un'
          : 'Quelqu\'un';
        sendPushNotification({
          userIds: [otherUserId],
          title: senderName,
          message: variables.content.substring(0, 100),
          type: 'private_chat',
          clickAction: '/messages',
          data: { senderId: user.id },
        }).catch(() => { /* silently ignore */ });
      }
    },
    onError: (error) => {
      toast.error('Erreur lors de l\'envoi du message');
      console.error(error);
    },
  });

  // Marquer les messages comme lus à l'ouverture
  useEffect(() => {
    const markAsRead = async () => {
      if (!user?.id || !otherUserId) return;

      await supabase
        .from('conversation_messages')
        .update({ is_read: true })
        .eq('sender_id', otherUserId)
        .eq('receiver_id', user.id)
        .eq('is_read', false);

      // Invalider les queries pour mettre à jour le compteur
      queryClient.invalidateQueries({ queryKey: ['conversations', user.id] });
      queryClient.invalidateQueries({ queryKey: ['unread-counts', user.id] });
    };

    markAsRead();
  }, [user?.id, otherUserId, queryClient]);

  // Scroll initial instantané au dernier message
  useEffect(() => {
    if (messages.length > 0 && !hasInitialScrolled.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
      hasInitialScrolled.current = true;
    } else if (hasInitialScrolled.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const otherUserName = otherUserProfile 
    ? `${otherUserProfile.first_name || ''} ${otherUserProfile.last_name || ''}`.trim() || otherUserProfile.username || 'Utilisateur'
    : 'Utilisateur';

  return (
    <div className="min-h-screen bg-gray-50 pb-16 md:pt-16 md:pb-0 flex flex-col">
      {/* Header */}
      <div className="bg-edu-whatsapp-green text-white p-4 flex items-center space-x-4 sticky top-0 md:top-16 z-10">
        <button onClick={() => navigate('/messages')} className="p-2 hover:bg-white/10 rounded-full">
          <ArrowLeft size={24} />
        </button>
        <button 
          onClick={() => navigate(`/profile/${otherUserId}`)}
          className="flex items-center space-x-3 flex-1 text-left hover:bg-white/10 rounded-lg p-2 -m-2 transition"
        >
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            {otherUserProfile?.avatar_url ? (
              <img src={otherUserProfile.avatar_url} alt={otherUserName} className="w-10 h-10 rounded-full" />
            ) : (
              <span className="text-lg font-semibold">{otherUserName[0]?.toUpperCase()}</span>
            )}
          </div>
          <div>
            <h2 className="font-semibold">{otherUserName}</h2>
            
          </div>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="text-center text-gray-500">
            {isOnline ? 'Chargement...' : 'Chargement depuis le cache...'}
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            <p>Aucun message pour le moment</p>
            <p className="text-sm mt-2">
              {isOnline 
                ? 'Envoyez un message pour démarrer la conversation'
                : 'Les messages seront chargés quand vous serez en ligne'}
            </p>
          </div>
        ) : (
          messages.map((msg: any) => (
            <ConversationMessageBubble 
              key={msg.id}
              message={msg} 
              onReply={(message) => setReplyingTo(message)}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input - Réutilisation de ChatInputBar */}
      <div className="bg-white border-t border-gray-200 p-4">
        {replyingTo && (
          <div className="bg-gray-100 p-2 rounded mb-2 flex justify-between items-center">
            <div className="text-sm">
              <span className="font-semibold text-[#25d366]">Répondre à:</span>
              <p className="text-gray-600 truncate">{replyingTo.content}</p>
            </div>
            <button 
              onClick={() => setReplyingTo(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
        )}
        <ChatInputBar
          onSendMessage={(content, messageType, file) => {
            if (content.trim() || file) {
              // Récupérer l'URL uploadée depuis le fichier si disponible
              const fileUrl = file && (file as any).uploadUrl;
              sendMessageMutation.mutate({ 
                content, 
                file, 
                fileUrl 
              });
            }
          }}
          disabled={sendMessageMutation.isPending}
        />
      </div>
    </div>
  );
};

export default Conversations;
