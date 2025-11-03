/**
 * Modal affichant la liste des statuts actifs de l'utilisateur
 */
import React from 'react';
import { X, Eye, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { type Story } from '@/stories/hooks/useStories';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface MyStoriesListModalProps {
  isOpen: boolean;
  onClose: () => void;
  stories: Story[];
  onViewStory: (story: Story) => void;
  onEditStory?: (story: Story) => void;
  onDeleteStory?: (storyId: string) => void;
}

const MyStoriesListModal: React.FC<MyStoriesListModalProps> = ({
  isOpen,
  onClose,
  stories,
  onViewStory,
  onEditStory,
  onDeleteStory,
}) => {
  const getStoryPreview = (story: Story) => {
    if (story.content_type === 'text') {
      return (
        <div 
          className="w-full h-full flex items-center justify-center p-4"
          style={{ backgroundColor: story.background_color || '#25d366' }}
        >
          <p className="text-white text-sm line-clamp-3 text-center font-medium">
            {story.content_text}
          </p>
        </div>
      );
    }
    
    if (story.content_type === 'image' && story.media_url) {
      return (
        <img 
          src={story.media_url} 
          alt="Story preview"
          className="w-full h-full object-cover"
        />
      );
    }
    
    return (
      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
        <span className="text-gray-400 text-xs">{story.content_type}</span>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Mes statuts</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3">
          {stories.map((story) => (
            <div
              key={story.id}
              className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              {/* Preview */}
              <button
                onClick={() => onViewStory(story)}
                className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0"
              >
                {getStoryPreview(story)}
              </button>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-600 mb-1">
                  Publié {formatDistanceToNow(new Date(story.created_at), { 
                    addSuffix: true, 
                    locale: fr 
                  })}
                </p>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Eye size={14} />
                  <span>{story.story_views?.length || 0} vue(s)</span>
                </div>
              </div>

              {/* Actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="p-2 hover:bg-accent rounded-full transition-colors"
                    title="Options"
                  >
                    <MoreVertical size={18} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onViewStory(story)}>
                    <Eye size={16} className="mr-2" />
                    Voir
                  </DropdownMenuItem>
                  {onEditStory && (
                    <DropdownMenuItem onClick={() => onEditStory(story)}>
                      <Pencil size={16} className="mr-2" />
                      Modifier
                    </DropdownMenuItem>
                  )}
                  {onDeleteStory && (
                    <DropdownMenuItem
                      onClick={() => onDeleteStory(story.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 size={16} className="mr-2" />
                      Supprimer
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MyStoriesListModal;
