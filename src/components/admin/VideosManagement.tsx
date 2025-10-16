import React, { useState } from 'react';
import { Plus, Edit, Trash2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useVideos } from '@/hooks/useVideos';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import EnhancedVideoCreateForm from './video/EnhancedVideoCreateForm';
import VideoEditForm from './video/VideoEditForm';

interface Video {
  id: string;
  title: string;
  description: string;
  video_url: string;
  thumbnail_url: string;
  likes_count: number;
  comments_count: number;
  author_id: string;
  video_type?: string;
  formation_id?: string;
  price?: number;
  profiles?: {
    first_name?: string;
    last_name?: string;
    username?: string;
    avatar_url?: string;
  };
}

const VideosManagement = () => {
  const { data: videos = [], refetch } = useVideos();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);

  const handleCreateSuccess = () => {
    setIsCreateOpen(false);
    refetch();
  };

  const handleEditSuccess = () => {
    setEditingVideo(null);
    refetch();
  };

  const handleEdit = (video: Video) => {
    setEditingVideo(video);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette vidéo ?')) {
      try {
        const { error } = await supabase
          .from('videos')
          .delete()
          .eq('id', id);

        if (error) {
          console.error('Delete error:', error);
          toast.error(`Erreur lors de la suppression: ${error.message}`);
          return;
        }
        
        toast.success('Vidéo supprimée avec succès');
        refetch();
      } catch (error: any) {
        console.error('Error:', error);
        toast.error(`Erreur lors de la suppression: ${error.message || 'Erreur inconnue'}`);
      }
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Gestion des Vidéos</h2>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-500 hover:bg-blue-600">
              <Plus size={16} className="mr-2" />
              Nouvelle Vidéo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Créer une nouvelle vidéo</DialogTitle>
            </DialogHeader>
            <EnhancedVideoCreateForm 
              onSuccess={handleCreateSuccess}
              onCancel={() => setIsCreateOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos.map((video) => (
          <Card key={video.id} className="overflow-hidden">
            <div className="aspect-video bg-gray-200 relative">
              {video.thumbnail_url ? (
                <img 
                  src={video.thumbnail_url} 
                  alt={video.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Play size={48} className="text-gray-400" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <Play size={32} className="text-white" />
              </div>
              {video.video_type && (
                <div className="absolute top-2 left-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    video.video_type === 'promo' ? 'bg-purple-500 text-white' :
                    video.video_type === 'lesson' ? 'bg-blue-500 text-white' :
                    'bg-gray-500 text-white'
                  }`}>
                    {video.video_type === 'promo' ? '🎓 Promo' :
                     video.video_type === 'lesson' ? '📚 Leçon' : '📹 Classique'}
                  </span>
                </div>
              )}
            </div>
            
            <CardHeader className="pb-2">
              <CardTitle className="text-lg line-clamp-2">{video.title}</CardTitle>
            </CardHeader>
            
            <CardContent>
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                {video.description}
              </p>
              
              <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                <span>👍 {video.likes_count}</span>
                <span>💬 {video.comments_count}</span>
                {video.video_type === 'promo' && <span>💰 Promo</span>}
              </div>
              
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(video)}
                  className="flex-1"
                >
                  <Edit size={14} className="mr-1" />
                  Modifier
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(video.id)}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal de modification */}
      {editingVideo && (
        <Dialog open={!!editingVideo} onOpenChange={() => setEditingVideo(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Modifier la vidéo</DialogTitle>
            </DialogHeader>
            <VideoEditForm 
              video={editingVideo}
              onSuccess={handleEditSuccess}
              onCancel={() => setEditingVideo(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default VideosManagement;