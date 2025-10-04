import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import ChatInputBar from '@/components/chat/ChatInputBar';
import ConversationMessageBubble from '@/components/conversations/ConversationMessageBubble';

const Conversations = () => {
  const { storyId, otherUserId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Récupérer les infos de l'autre utilisateur
  const { data: otherUserProfile } = useQuery({
    queryKey: ['profile', otherUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, username, avatar_url')
        .eq('id', otherUserId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!otherUserId,
  });

  // Récupérer les messages de cette conversation
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['conversation-messages', storyId, otherUserId],
    queryFn: async () => {
      if (!user?.id) return [];

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
        .eq('story_id', storyId)
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && !!storyId && !!otherUserId,
    refetchInterval: 3000,
  });

  // Envoyer un message
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!user?.id) throw new Error('Non authentifié');

      const { error } = await supabase
        .from('conversation_messages')
        .insert({
          story_id: storyId,
          sender_id: user.id,
          receiver_id: otherUserId,
          content,
          is_story_reply: !!storyId,
          replied_to_message_id: replyingTo?.id || null,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation-messages', storyId, otherUserId] });
      setReplyingTo(null);
    },
    onError: (error) => {
      toast.error('Erreur lors de l\'envoi du message');
      console.error(error);
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
          <div className="text-center text-gray-500">Chargement...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            <p>Aucun message pour le moment</p>
            <p className="text-sm mt-2">Envoyez un message pour démarrer la conversation</p>
          </div>
        ) : (
          messages.map((msg: any) => (
            <div key={msg.id} className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'} mb-4`}>
              {msg.is_story_reply && (
                <div className={`flex items-center gap-1 mb-1 ${msg.sender_id === user?.id ? 'text-white/80 ml-auto' : 'text-[#25d366]'}`}>
                  <ImageIcon size={12} />
                  <span className="text-[10px] font-medium uppercase tracking-wide">Réponse Story</span>
                </div>
              )}
              <ConversationMessageBubble 
                message={msg} 
                onReply={(message) => setReplyingTo(message)}
              />
            </div>
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
          onSendMessage={(content) => {
            if (content.trim()) {
              sendMessageMutation.mutate(content);
            }
          }}
          disabled={sendMessageMutation.isPending}
        />
      </div>
    </div>
  );
};

export default Conversations;
