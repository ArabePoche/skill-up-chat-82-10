/**
 * Formulaire d'édition des métadonnées d'une vidéo (titre, description, miniature, type, formation).
 * Permet de capturer une miniature directement depuis la vidéo en mettant en pause.
 */
import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useFormations } from '@/hooks/useFormations';
import { Upload, Camera, Play, Pause } from 'lucide-react';

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
  profiles?: {
    first_name?: string;
    last_name?: string;
    username?: string;
    avatar_url?: string;
  };
}

interface VideoEditFormProps {
  video: Video;
  onSuccess: () => void;
  onCancel: () => void;
}

const VideoEditForm: React.FC<VideoEditFormProps> = ({ video, onSuccess, onCancel }) => {
  const { user } = useAuth();
  const { uploadFile, isUploading } = useFileUpload();
  const { data: formations = [] } = useFormations();
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [formData, setFormData] = useState({
    title: video.title || '',
    description: video.description || '',
    video_url: video.video_url || '',
    thumbnail_url: video.thumbnail_url || '',
    video_type: (video.video_type as 'lesson' | 'promo' | 'classic') || 'classic',
    formation_id: video.formation_id || '',
  });
  
  const [selectedThumbnailFile, setSelectedThumbnailFile] = useState<File | null>(null);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleThumbnailFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Veuillez sélectionner un fichier image');
        return;
      }
      setSelectedThumbnailFile(file);
      setCapturedPreview(URL.createObjectURL(file));
    }
  };

  // Capturer la frame actuelle de la vidéo comme miniature
  const captureCurrentFrame = useCallback(() => {
    const vid = videoRef.current;
    if (!vid || !vid.videoWidth || !vid.videoHeight) {
      toast.error('Mettez la vidéo en pause sur la frame souhaitée');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = vid.videoWidth;
    canvas.height = vid.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `thumbnail_${Date.now()}.jpg`, { type: 'image/jpeg' });
      setSelectedThumbnailFile(file);
      setCapturedPreview(canvas.toDataURL('image/jpeg', 0.92));
      toast.success('Miniature capturée !');
    }, 'image/jpeg', 0.92);
  }, []);

  const togglePlayPause = useCallback(() => {
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.paused) {
      vid.play();
      setIsVideoPlaying(true);
    } else {
      vid.pause();
      setIsVideoPlaying(false);
    }
  }, []);

  const uploadThumbnailFile = async (file: File): Promise<string> => {
    const result = await uploadFile(file, 'lesson_discussion_files');
    return result.fileUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.video_url.trim()) {
      toast.error('Le titre et l\'URL de la vidéo sont requis');
      return;
    }

    try {
      let thumbnailUrl = formData.thumbnail_url;

      if (selectedThumbnailFile) {
        thumbnailUrl = await uploadThumbnailFile(selectedThumbnailFile);
      }

      const videoData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        video_url: formData.video_url.trim(),
        thumbnail_url: thumbnailUrl.trim() || null,
        video_type: formData.video_type,
        formation_id: formData.formation_id.trim() || null,
      };

      const { data: updated, error } = await supabase
        .from('videos')
        .update(videoData)
        .eq('id', video.id)
        .select()
        .maybeSingle();

      if (error) throw error;

      if (!updated) {
        toast.error("Mise à jour non appliquée (pas d'autorisation ou élément introuvable)");
        return;
      }
      
      toast.success('Vidéo modifiée avec succès');
      onSuccess();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erreur lors de la modification');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      <div>
        <Label htmlFor="title">Titre</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => handleInputChange('title', e.target.value)}
          placeholder="Titre de la vidéo"
          required
        />
      </div>
      
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder="Description de la vidéo"
          rows={3}
        />
      </div>

      {/* Section miniature avec capture vidéo */}
      <div>
        <Label>Miniature de couverture</Label>
        <div className="space-y-3 mt-1">
          {/* Lecteur vidéo pour capture */}
          {formData.video_url && (
            <div className="rounded-lg overflow-hidden border border-border bg-black relative">
              <video
                ref={videoRef}
                src={formData.video_url}
                crossOrigin="anonymous"
                playsInline
                preload="metadata"
                className="w-full max-h-48 object-contain"
                onPlay={() => setIsVideoPlaying(true)}
                onPause={() => setIsVideoPlaying(false)}
              />
              <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="bg-black/60 text-white hover:bg-black/80 backdrop-blur-sm h-8"
                  onClick={togglePlayPause}
                >
                  {isVideoPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="bg-black/60 text-white hover:bg-black/80 backdrop-blur-sm h-8 flex-1"
                  onClick={captureCurrentFrame}
                >
                  <Camera className="h-3.5 w-3.5 mr-1.5" />
                  Capturer cette frame
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground text-center py-1 bg-muted/50">
                Naviguez dans la vidéo puis capturez la frame souhaitée
              </p>
            </div>
          )}

          {/* Prévisualisation de la miniature */}
          {(capturedPreview || (formData.thumbnail_url && !selectedThumbnailFile)) && (
            <div className="border border-border rounded-lg p-2">
              <img 
                src={capturedPreview || formData.thumbnail_url} 
                alt="Miniature" 
                className="w-full h-28 object-cover rounded"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {capturedPreview ? 'Nouvelle miniature capturée' : 'Miniature actuelle'}
              </p>
            </div>
          )}
          
          {/* Upload de fichier alternatif */}
          <div className="border-2 border-dashed border-border rounded-lg p-3">
            <div className="text-center">
              <Upload className="mx-auto h-6 w-6 text-muted-foreground" />
              <p className="text-xs text-muted-foreground mt-1">Ou uploadez une image</p>
              <Input
                type="file"
                accept="image/*"
                onChange={handleThumbnailFileSelect}
                className="mt-2"
              />
            </div>
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="video_type">Type de vidéo</Label>
        <Select
          value={formData.video_type}
          onValueChange={(value: 'lesson' | 'promo' | 'classic') => 
            handleInputChange('video_type', value)
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner le type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="classic">Classique</SelectItem>
            <SelectItem value="promo">Promotion</SelectItem>
            <SelectItem value="lesson">Leçon</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {(formData.video_type === 'promo' || formData.video_type === 'lesson') && (
        <div>
          <Label htmlFor="formation_id">Formation associée</Label>
          <Select
            value={formData.formation_id}
            onValueChange={(value) => handleInputChange('formation_id', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner une formation" />
            </SelectTrigger>
            <SelectContent>
              {formations.map((formation) => (
                <SelectItem key={formation.id} value={formation.id}>
                  {formation.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex space-x-2 pt-2">
        <Button type="submit" className="flex-1" disabled={isUploading}>
          {isUploading ? 'Upload en cours...' : 'Modifier'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isUploading}>
          Annuler
        </Button>
      </div>
    </form>
  );
};

export default VideoEditForm;
