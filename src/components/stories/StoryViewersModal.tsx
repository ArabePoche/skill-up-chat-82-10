import React from 'react';
import { X, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface StoryViewersModalProps {
  isOpen: boolean;
  onClose: () => void;
  storyId: string;
}

const StoryViewersModal: React.FC<StoryViewersModalProps> = ({ isOpen, onClose, storyId }) => {
  const { data: viewers = [], isLoading } = useQuery({
    queryKey: ['story-viewers', storyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('story_views')
        .select(`
          viewer_id,
          viewed_at,
          profiles:viewer_id (
            id,
            first_name,
            last_name,
            username,
            avatar_url
          )
        `)
        .eq('story_id', storyId)
        .order('viewed_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: isOpen && !!storyId,
  });

  const formatViewTime = (dateString: string) => {
    const now = new Date();
    const viewDate = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - viewDate.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'À l\'instant';
    if (diffInMinutes < 60) return `Il y a ${diffInMinutes} min`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `Il y a ${diffInHours}h`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `Il y a ${diffInDays}j`;
  };

  const formatUserName = (profile: any) => {
    if (!profile) return 'Utilisateur inconnu';
    const firstName = profile.first_name || '';
    const lastName = profile.last_name || '';
    return `${firstName} ${lastName}`.trim() || profile.username || 'Utilisateur';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              Vues
            </DialogTitle>
            <button
              onClick={onClose}
              className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </DialogHeader>

        <div className="mt-4">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-20"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : viewers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Eye className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>Aucune vue pour le moment</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {viewers.map((view: any) => (
                <div key={view.viewer_id} className="flex items-center gap-3 py-2">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={view.profiles?.avatar_url} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {formatUserName(view.profiles).charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {formatUserName(view.profiles)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatViewTime(view.viewed_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isLoading && viewers.length > 0 && (
            <div className="mt-4 pt-4 border-t text-center">
              <p className="text-sm text-gray-600">
                {viewers.length} vue{viewers.length > 1 ? 's' : ''} au total
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StoryViewersModal;
