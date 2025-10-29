
import React, { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Send, Eye, Mic } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMarkStoryAsViewed } from '@/hooks/useStories';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import StoryViewersModal from '@/components/stories/StoryViewersModal';
import { useNavigate } from 'react-router-dom';
import VerifiedBadge from '@/components/VerifiedBadge';

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
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [savedProgress, setSavedProgress] = useState(0); // Sauvegarder la progression pendant la pause
  const [replyText, setReplyText] = useState('');
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [showViewersModal, setShowViewersModal] = useState(false);
  const [mediaDuration, setMediaDuration] = useState<number>(10); // Durée par défaut de 10s pour texte/image
  const [audioEnded, setAudioEnded] = useState(false);
  const markAsViewed = useMarkStoryAsViewed();
  const { user } = useAuth();
  const story = stories[currentStoryIndex];
  
  // Vérifier si c'est ma story
  const isMyStory = story?.user_id === user?.id;
  const viewsCount = story?.story_views?.length || 0;

  useEffect(() => {
    if (story?.id && story?.user_id) {
      markAsViewed.mutate({ storyId: story.id, storyUserId: story.user_id });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.id, story?.user_id]);

  // Réinitialiser la progression quand on change de story
  useEffect(() => {
    setProgress(0);
    setSavedProgress(0);
    setAudioEnded(false);
    // Réinitialiser la durée par défaut pour les nouvelles stories
    if (story.content_type === 'text' || story.content_type === 'image') {
      setMediaDuration(10);
    }
  }, [currentStoryIndex, story.content_type]);

  // Gérer la progression de la story
  useEffect(() => {
    if (isPaused) {
      // Sauvegarder la progression actuelle lors de la pause
      setSavedProgress(progress);
      return;
    }
    
    // Pour les audios, on ne gère pas la progression automatique
    // Elle sera déclenchée par l'événement onEnded
    if (story.content_type === 'audio' && !audioEnded) {
      return;
    }
    
    // Restaurer la progression sauvegardée lors de la reprise
    if (savedProgress > 0 && progress === 0) {
      setProgress(savedProgress);
    }
    
    // Calculer l'intervalle basé sur la durée du média
    const intervalTime = (mediaDuration * 1000) / 100; // Diviser la durée totale en 100 étapes
    
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          onNext();
          return 0;
        }
        return prev + 1;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isPaused, mediaDuration, onNext, progress, savedProgress, story.content_type, audioEnded]);

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

  const handleStoryPressStart = () => {
    setIsPaused(true);
  };

  const handleStoryPressEnd = () => {
    setIsPaused(false);
  };

  const handleOpenViewers = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('Opening viewers modal for story:', story.id);
    console.log('isMyStory:', isMyStory);
    console.log('viewsCount:', viewsCount);
    setIsPaused(true);
    setShowViewersModal(true);
    console.log('showViewersModal set to true');
  };

  const handleCloseViewers = () => {
    setShowViewersModal(false);
    setIsPaused(false);
  };

  const handleOpenReply = () => {
    setIsPaused(true);
    setShowReplyInput(true);
  };

  const handleCloseReply = () => {
    setShowReplyInput(false);
    setReplyText('');
    setIsPaused(false);
  };

  const handleReply = async () => {
    if (!replyText.trim() || !user?.id || !story?.id || isReplying) return;

    setIsReplying(true);
    try {
      // Envoyer directement le message lié à la story
      const { error: messageError } = await supabase
        .from('conversation_messages')
        .insert({
          story_id: story.id,
          sender_id: user.id,
          receiver_id: story.user_id,
          content: replyText,
          is_story_reply: true
        });

      if (messageError) {
        throw messageError;
      }

      toast.success('Réponse envoyée!');
      setReplyText('');
      setShowReplyInput(false);
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.error('Erreur lors de l\'envoi de la réponse');
    } finally {
      setIsReplying(false);
      handleCloseReply();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleReply();
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col">
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
      <div className="absolute top-12 left-4 right-4 flex items-center justify-between text-white z-30">
        <div 
          className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => story.profiles?.id && navigate(`/profile/${story.profiles.id}`)}
        >
          <Avatar className="w-8 h-8 border-2 border-white">
            <AvatarImage src={story.profiles?.avatar_url} />
            <AvatarFallback className="bg-gray-600 text-white text-xs">
              {story.profiles?.first_name?.[0] || story.profiles?.username?.[0] || 'U'}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-sm inline-flex items-center gap-1">
              {story.profiles?.first_name || story.profiles?.username || 'Utilisateur'}
              {story.profiles?.is_verified && <VerifiedBadge size={14} showTooltip={false} />}
            </p>
            <p className="text-xs text-white/70">
              {formatTimeAgo(story.created_at)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isMyStory && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleOpenViewers}
              className="text-white hover:bg-white/20 flex items-center gap-1 h-8 px-2"
            >
              <Eye size={16} />
              <span className="text-sm">{viewsCount}</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/20 w-8 h-8"
          >
            <X size={20} />
          </Button>
        </div>
      </div>

      {/* Navigation zones */}
      <div 
        className="absolute left-0 top-20 w-1/3 h-[calc(100%-200px)] cursor-pointer z-10"
        onClick={handlePrevious}
      />
      <div 
        className="absolute right-0 top-20 w-1/3 h-[calc(100%-200px)] cursor-pointer z-10"
        onClick={handleNext}
      />
      <div 
        className="absolute left-1/3 top-20 w-1/3 h-[calc(100%-200px)] cursor-pointer z-10"
        onMouseDown={handleStoryPressStart}
        onMouseUp={handleStoryPressEnd}
        onMouseLeave={handleStoryPressEnd}
        onTouchStart={handleStoryPressStart}
        onTouchEnd={handleStoryPressEnd}
        onTouchCancel={handleStoryPressEnd}
      />

      {/* Story content - zone contrainte entre header et reply */}
      <div className="absolute left-0 right-0 flex items-center justify-center" style={{ top: '140px', bottom: '180px' }}>
        <div className="w-full h-full flex flex-col items-center justify-center px-4">
          {story.content_type === 'text' && (
            <div 
              className="max-w-xs w-full p-6 rounded-2xl text-center shadow-lg"
              style={{ backgroundColor: story.background_color || '#25d366' }}
            >
              <p className="text-white text-lg font-medium leading-relaxed">
                {story.content_text}
              </p>
            </div>
          )}

          {story.content_type === 'image' && (
            <div className="flex flex-col items-center max-w-full">
              <img 
                src={story.media_url} 
                alt="Story content"
                className="max-w-full max-h-[calc(100vh-400px)] object-contain rounded-lg"
              />
              {story.description && (
                <p className="text-white text-sm mt-4 px-4 text-center max-w-md">
                  {story.description}
                </p>
              )}
            </div>
          )}

          {story.content_type === 'video' && (
            <div className="flex flex-col items-center max-w-full">
              <video 
                src={story.media_url}
                className="max-w-full max-h-[calc(100vh-400px)] object-contain rounded-lg"
                autoPlay
                playsInline
                onLoadedMetadata={(e) => {
                  const duration = e.currentTarget.duration;
                  setMediaDuration(duration);
                }}
              />
              {story.description && (
                <p className="text-white text-sm mt-4 px-4 text-center max-w-md">
                  {story.description}
                </p>
              )}
            </div>
          )}

          {story.content_type === 'audio' && (
            <div className="w-full max-w-xs p-8 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl shadow-lg flex flex-col items-center justify-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                <Mic size={40} className="text-primary" />
              </div>
              <audio
                src={story.media_url}
                controls
                autoPlay
                playsInline
                onLoadedMetadata={(e) => {
                  const duration = e.currentTarget.duration;
                  console.log('Audio duration loaded:', duration);
                  if (duration && isFinite(duration)) {
                    setMediaDuration(duration);
                  }
                }}
                onTimeUpdate={(e) => {
                  if (!isPaused && story.content_type === 'audio') {
                    const audio = e.currentTarget;
                    const percentage = (audio.currentTime / audio.duration) * 100;
                    setProgress(percentage);
                  }
                }}
                onEnded={() => {
                  console.log('Audio ended, moving to next story');
                  setAudioEnded(true);
                  setProgress(100);
                  setTimeout(() => {
                    onNext();
                  }, 300);
                }}
                onCanPlay={(e) => {
                  const duration = e.currentTarget.duration;
                  console.log('Audio can play, duration:', duration);
                  if (duration && isFinite(duration) && mediaDuration === 10) {
                    setMediaDuration(duration);
                  }
                }}
                onDurationChange={(e) => {
                  const duration = e.currentTarget.duration;
                  console.log('Audio duration changed:', duration);
                  if (duration && isFinite(duration)) {
                    setMediaDuration(duration);
                  }
                }}
                onError={(e) => {
                  console.error('Error loading audio:', e);
                }}
                className="w-full"
              />
              <p className="text-white/70 text-sm text-center">Message vocal</p>
              {story.description && (
                <p className="text-white text-sm mt-2 px-4 text-center max-w-md">
                  {story.description}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Reply section - AMÉLIORÉ POUR MOBILE */}
      <div className="absolute bottom-20 sm:bottom-24 left-4 right-4 z-40">
        {showReplyInput ? (
          <div className="flex items-center space-x-2 sm:space-x-3 bg-white/10 backdrop-blur-sm rounded-full px-3 sm:px-4 py-2 sm:py-3">
            <Button
              onClick={handleCloseReply}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 px-2"
            >
              <X size={16} />
            </Button>
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
            onClick={handleOpenReply}
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

      {/* Modal des vues */}
      {isMyStory && showViewersModal && (
        <StoryViewersModal
          isOpen={showViewersModal}
          onClose={handleCloseViewers}
          storyId={story.id}
        />
      )}
    </div>
  );
};

export default StoryViewer;
