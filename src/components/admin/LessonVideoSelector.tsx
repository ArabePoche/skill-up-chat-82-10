
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLessonVideos } from '@/hooks/useLessonVideos';
import { Video, Link } from 'lucide-react';

interface LessonVideoSelectorProps {
  onVideoSelect: (videoUrl: string) => void;
  currentVideoUrl?: string;
}

const LessonVideoSelector: React.FC<LessonVideoSelectorProps> = ({
  onVideoSelect,
  currentVideoUrl
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [manualUrl, setManualUrl] = useState('');
  const [selectedVideoId, setSelectedVideoId] = useState('');
  const { data: lessonVideos, isLoading } = useLessonVideos();

  const handleVideoFromList = () => {
    const selectedVideo = lessonVideos?.find(video => video.id === selectedVideoId);
    if (selectedVideo?.video_url) {
      onVideoSelect(selectedVideo.video_url);
      setIsOpen(false);
      setSelectedVideoId('');
    }
  };

  const handleManualUrl = () => {
    if (manualUrl.trim()) {
      onVideoSelect(manualUrl.trim());
      setIsOpen(false);
      setManualUrl('');
    }
  };

  return (
    <div className="space-y-2">
      <Label>URL de la vidéo</Label>
      <div className="flex gap-2">
        <Input
          value={currentVideoUrl || ''}
          onChange={(e) => onVideoSelect(e.target.value)}
          placeholder="URL de la vidéo"
          className="flex-1"
        />
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" size="sm">
              <Video size={16} className="mr-1" />
              Choisir
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Sélectionner une vidéo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Sélection depuis la liste */}
              <div className="space-y-2">
                <Label>Choisir depuis les vidéos existantes</Label>
                <Select value={selectedVideoId} onValueChange={setSelectedVideoId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une vidéo" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoading ? (
                      <SelectItem value="loading" disabled>Chargement...</SelectItem>
                    ) : (
                      lessonVideos?.map((video) => (
                        <SelectItem key={video.id} value={video.id}>
                          {video.title} - {video.profiles?.first_name} {video.profiles?.last_name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <Button 
                  onClick={handleVideoFromList} 
                  disabled={!selectedVideoId}
                  className="w-full"
                >
                  Utiliser cette vidéo
                </Button>
              </div>

              <div className="text-center text-sm text-gray-500">ou</div>

              {/* URL manuelle */}
              <div className="space-y-2">
                <Label>Insérer une URL manuellement</Label>
                <Input
                  value={manualUrl}
                  onChange={(e) => setManualUrl(e.target.value)}
                  placeholder="https://..."
                />
                <Button 
                  onClick={handleManualUrl} 
                  disabled={!manualUrl.trim()}
                  className="w-full"
                  variant="outline"
                >
                  <Link size={16} className="mr-1" />
                  Utiliser cette URL
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default LessonVideoSelector;
