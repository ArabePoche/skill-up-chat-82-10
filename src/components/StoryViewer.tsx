
import React, { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Send } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMarkStoryAsViewed } from '@/hooks/useStories';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface StoryViewerProps {
  stories: any[];
  currentStoryIndex: number;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
}

const StoryViewer: React.FC<StoryViewerProps> = ({ 
  stories, 
  currentStoryIndex, 
  onClose, 
  onNext, 
  onPrevious 
}) => {
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const markAsViewed = useMarkStoryAsViewed();
  const { user } = useAuth();
  const story = stories[currentStoryIndex];

  useEffect(() => {
    if (story?.id) {
      markAsViewed.mutate(story.id);
    }
  }, [story?.id, markAsViewed]);

  useEffect(() => {
    if (isPaused) return;
    
    setProgress(0);
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          onNext();
          return 0;
        }
        return prev + 1;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [currentStoryIndex, onNext, isPaused]);

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const storyDate = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - storyDate.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'il y a quelques minutes';
    if (diffInHours === 1) return 'il y a 1 heure';
    return `il y a ${diffInHours}h`;
  };

  const handleNext = () => {
    if (currentStoryIndex < stories.length - 1) {
      onNext();
    } else {
      onClose();
    }
  };

  const handlePrevious = () => {
    if (currentStoryIndex > 0) {
      onPrevious();
    }
  };

  const handleStoryPress = () => {
    setIsPaused(true);
    setTimeout(() => setIsPaused(false), 200);
  };

  const handleReply = async () => {
    if (!replyText.trim() || !user?.id || !story?.id || isReplying) return;

    setIsReplying(true);
    try {
      // 1. Créer ou récupérer la conversation
      const { data: existingConv } = await supabase
        .from('story_conversations')
        .select('id')
        .eq('story_id', story.id)
        .or(`and(participant1_id.eq.${user.id},participant2_id.eq.${story.user_id}),and(participant1_id.eq.${story.user_id},participant2_id.eq.${user.id})`)
        .maybeSingle();

      let conversationId = existingConv?.id;

      if (!conversationId) {
        const { data: newConv, error: convError } = await supabase
          .from('story_conversations')
          .insert({
            story_id: story.id,
            participant1_id: user.id,
            participant2_id: story.user_id,
            last_message_at: new Date().toISOString()
          })
          .select('id')
          .single();

        if (convError) {
          throw convError;
        }
        conversationId = newConv.id;
      }

      // 2. Préparer l'extrait de story
      let storyReference = '';
      if (story.content_type === 'text' && story.content_text) {
        storyReference = story.content_text.substring(0, 100);
      } else if (story.content_type === 'image') {
        storyReference = '📸 Photo partagée';
      } else if (story.content_type === 'video') {
        storyReference = '🎥 Vidéo partagée';
      }

      // 3. Envoyer le message
      const { error: messageError } = await supabase
        .from('story_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: replyText,
          story_reference: storyReference
        });

      if (messageError) {
        throw messageError;
      }

      // 4. Mettre à jour last_message_at
      await supabase
        .from('story_conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);

      toast.success('Réponse envoyée!');
      setReplyText('');
      setShowReplyInput(false);
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.error('Erreur lors de l\'envoi de la réponse');
    } finally {
      setIsReplying(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleReply();
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      {/* Progress bars */}
      <div className="absolute top-4 left-4 right-4 flex space-x-1 z-20">
        {stories.map((_, index) => (
          <div key={index} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white rounded-full transition-all duration-100"
              style={{ 
                width: index < currentStoryIndex ? '100%' : 
                       index === currentStoryIndex ? `${progress}%` : '0%'
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-12 left-4 right-4 flex items-center justify-between text-white z-20">
        <div className="flex items-center space-x-3">
          <Avatar className="w-8 h-8 border-2 border-white">
            <AvatarImage src={story.profiles?.avatar_url} />
            <AvatarFallback className="bg-gray-600 text-white text-xs">
              {story.profiles?.first_name?.[0] || story.profiles?.username?.[0] || 'U'}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-sm">
              {story.profiles?.first_name || story.profiles?.username || 'Utilisateur'}
            </p>
            <p className="text-xs text-white/70">
              {formatTimeAgo(story.created_at)}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-white hover:bg-white/20 w-8 h-8"
        >
          <X size={20} />
        </Button>
      </div>

      {/* Navigation zones */}
      <div 
        className="absolute left-0 top-0 w-1/3 h-full cursor-pointer z-10"
        onClick={handlePrevious}
      />
      <div 
        className="absolute right-0 top-0 w-1/3 h-full cursor-pointer z-10"
        onClick={handleNext}
      />
      <div 
        className="absolute left-1/3 top-0 w-1/3 h-full cursor-pointer z-10"
        onMouseDown={handleStoryPress}
      />

      {/* Story content */}
      <div className="w-full h-full flex items-center justify-center">
        {story.content_type === 'text' && (
          <div 
            className="max-w-xs mx-auto p-6 rounded-2xl text-center shadow-lg"
            style={{ backgroundColor: story.background_color || '#25d366' }}
          >
            <p className="text-white text-lg font-medium leading-relaxed">
              {story.content_text}
            </p>
          </div>
        )}

        {story.content_type === 'image' && (
          <img 
            src={story.media_url} 
            alt="Story content"
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        )}

        {story.content_type === 'video' && (
          <video 
            src={story.media_url}
            className="max-w-full max-h-full object-contain rounded-lg"
            autoPlay
            muted
            loop
          />
        )}
      </div>

      {/* Reply section - AMÉLIORÉ POUR MOBILE */}
      <div className="absolute bottom-4 sm:bottom-6 left-4 right-4 z-30">
        {showReplyInput ? (
          <div className="flex items-center space-x-2 sm:space-x-3 bg-white/10 backdrop-blur-sm rounded-full px-3 sm:px-4 py-2 sm:py-3">
            <Input
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Répondre à cette story..."
              className="flex-1 bg-transparent border-none text-white placeholder-white/70 focus:ring-0 text-sm sm:text-base"
              autoFocus
              disabled={isReplying}
            />
            <Button
              onClick={handleReply}
              disabled={!replyText.trim() || isReplying}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 px-2 sm:px-3 py-1 sm:py-2"
            >
              {isReplying ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              ) : (
                <Send size={16} />
              )}
            </Button>
          </div>
        ) : (
          <Button
            onClick={() => setShowReplyInput(true)}
            variant="ghost"
            className="w-full text-white border border-white/30 hover:bg-white/10 rounded-full py-2 sm:py-3 text-sm sm:text-base"
          >
            Répondre à {story.profiles?.first_name || 'cette story'}...
          </Button>
        )}
      </div>

      {/* Navigation buttons */}
      {currentStoryIndex > 0 && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePrevious}
          className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:bg-white/20 w-10 h-10 z-20"
        >
          <ChevronLeft size={24} />
        </Button>
      )}

      {currentStoryIndex < stories.length - 1 && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleNext}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:bg-white/20 w-10 h-10 z-20"
        >
          <ChevronRight size={24} />
        </Button>
      )}
    </div>
  );
};

export default StoryViewer;
