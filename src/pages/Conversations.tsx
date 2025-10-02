import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Paperclip, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const Conversations = () => {
  const { storyId, otherUserId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [message, setMessage] = useState('');
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
    queryKey: ['story-messages', storyId, otherUserId],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('story_messages')
        .select(`
          id,
          content,
          sender_id,
          receiver_id,
          created_at,
          profiles:sender_id (
            first_name,
            last_name,
            username,
            avatar_url
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
        .from('story_messages')
        .insert({
          story_id: storyId,
          sender_id: user.id,
          receiver_id: otherUserId,
          content,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['story-messages', storyId, otherUserId] });
      setMessage('');
    },
    onError: (error) => {
      toast.error('Erreur lors de l\'envoi du message');
      console.error(error);
    },
  });

  const handleSendMessage = () => {
    if (!message.trim()) return;
    sendMessageMutation.mutate(message);
  };

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
        <div className="flex items-center space-x-3 flex-1">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            {otherUserProfile?.avatar_url ? (
              <img src={otherUserProfile.avatar_url} alt={otherUserName} className="w-10 h-10 rounded-full" />
            ) : (
              <span className="text-lg font-semibold">{otherUserName[0]?.toUpperCase()}</span>
            )}
          </div>
          <div>
            <h2 className="font-semibold">{otherUserName}</h2>
            <p className="text-xs text-white/80">Conversation Story</p>
          </div>
        </div>
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
          messages.map((msg) => {
            const isOwnMessage = msg.sender_id === user?.id;
            return (
              <div key={msg.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-2 relative ${
                    isOwnMessage
                      ? 'bg-gradient-to-br from-[#25d366] to-[#20ba5a] text-white rounded-br-sm shadow-md'
                      : 'bg-white text-gray-800 rounded-bl-sm shadow-md border border-[#25d366]/20'
                  }`}
                >
                  {/* Badge Story Reply */}
                  <div className={`flex items-center gap-1 mb-1.5 ${isOwnMessage ? 'text-white/80' : 'text-[#25d366]'}`}>
                    <ImageIcon size={12} />
                    <span className="text-[10px] font-medium uppercase tracking-wide">Réponse Story</span>
                  </div>
                  <p className="text-sm break-words">{msg.content}</p>
                  <p className={`text-xs mt-1 ${isOwnMessage ? 'text-white/70' : 'text-gray-500'}`}>
                    {new Date(msg.created_at).toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 p-4 flex items-center space-x-2">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Écrivez un message..."
          className="flex-1"
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
        />
        <Button
          onClick={handleSendMessage}
          disabled={!message.trim() || sendMessageMutation.isPending}
          size="icon"
          className="bg-edu-primary hover:bg-edu-primary/90"
        >
          <Send size={20} />
        </Button>
      </div>
    </div>
  );
};

export default Conversations;
