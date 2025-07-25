
import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import VideoCommentItem from '@/components/VideoCommentItem';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface VideoCommentRepliesProps {
  replies: any[];
  onReply: (parentCommentId: string, content: string) => Promise<boolean>;
  parentCommentId: string;
}

const VideoCommentReplies: React.FC<VideoCommentRepliesProps> = ({
  replies,
  onReply,
  parentCommentId
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(5);

  if (!replies || replies.length === 0) return null;

  const handleToggle = () => {
    if (isOpen) {
      // Si ouvert, on ferme tout et remet à 5
      setIsOpen(false);
      setVisibleCount(5);
    } else {
      // Si fermé, on ouvre et affiche les 5 premiers
      setIsOpen(true);
      setVisibleCount(5);
    }
  };

  const handleShowMore = () => {
    setVisibleCount(prev => Math.min(prev + 5, replies.length));
  };

  const visibleReplies = replies.slice(0, visibleCount);
  const hasMoreReplies = visibleCount < replies.length;
  const allRepliesVisible = visibleCount >= replies.length;

  return (
    <div className="mt-3">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            onClick={handleToggle}
            className="flex items-center space-x-2 text-sm text-gray-400 hover:text-blue-400 transition-colors p-0 h-auto font-normal"
          >
            {isOpen ? (
              <>
                <ChevronUp size={16} />
                <span>Masquer les réponses</span>
              </>
            ) : (
              <>
                <ChevronDown size={16} />
                <span>Afficher {replies.length} réponse{replies.length > 1 ? 's' : ''}</span>
              </>
            )}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="space-y-3 mt-3 animate-accordion-down data-[state=closed]:animate-accordion-up">
          {visibleReplies.map((reply) => (
            <div key={reply.id} className="ml-4 border-l border-gray-700 pl-4">
              <VideoCommentItem
                comment={reply}
                onReply={onReply}
                level={1}
              />
            </div>
          ))}
          
          {hasMoreReplies && allRepliesVisible === false && (
            <Button
              variant="ghost"
              onClick={handleShowMore}
              className="ml-4 text-sm text-blue-400 hover:text-blue-300 transition-colors p-0 h-auto font-medium"
            >
              Afficher {Math.min(5, replies.length - visibleCount)} réponse{(replies.length - visibleCount) > 1 ? 's' : ''} supplémentaire{(replies.length - visibleCount) > 1 ? 's' : ''}
            </Button>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default VideoCommentReplies;
