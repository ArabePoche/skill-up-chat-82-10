
import React, { useState } from 'react';
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
import { Upload } from 'lucide-react';

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
  
  const [formData, setFormData] = useState({
    title: video.title || '',
    description: video.description || '',
    video_url: video.video_url || '',
    thumbnail_url: video.thumbnail_url || '',
    video_type: (video.video_type as 'lesson' | 'promo' | 'classic') || 'classic',
    formation_id: video.formation_id || '',
  });
  
  const [selectedThumbnailFile, setSelectedThumbnailFile] = useState<File | null>(null);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleThumbnailFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Veuillez sélectionner un fichier image');
        return;
      }
      setSelectedThumbnailFile(file);
    }
  };

  const uploadThumbnailFile = async (file: File): Promise<string> => {
    try {
      const result = await uploadFile(file, 'lesson_discussion_files');
      return result.fileUrl;
    } catch (error) {
      console.error('Erreur upload miniature:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.video_url.trim()) {
      toast.error('Le titre et l\'URL de la vidéo sont requis');
      return;
    }

    try {
      let thumbnailUrl = formData.thumbnail_url;

      // Uploader la miniature si un fichier est sélectionné
      if (selectedThumbnailFile) {
        console.log('Upload de la miniature:', selectedThumbnailFile.name);
        thumbnailUrl = await uploadThumbnailFile(selectedThumbnailFile);
        console.log('Miniature uploadée:', thumbnailUrl);
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
    <form onSubmit={handleSubmit} className="space-y-4">
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
      
      <div>
        <Label htmlFor="video_url">URL de la vidéo</Label>
        <Input
          id="video_url"
          type="url"
          value={formData.video_url}
          onChange={(e) => handleInputChange('video_url', e.target.value)}
          placeholder="https://example.com/video.mp4"
          required
        />
      </div>
      
      <div>
        <Label>Miniature de couverture (optionnel)</Label>
        <div className="space-y-3">
          {/* Prévisualisation actuelle */}
          {formData.thumbnail_url && !selectedThumbnailFile && (
            <div className="border border-border rounded-lg p-2">
              <img 
                src={formData.thumbnail_url} 
                alt="Miniature actuelle" 
                className="w-full h-32 object-cover rounded"
              />
              <p className="text-xs text-muted-foreground mt-1">Miniature actuelle</p>
            </div>
          )}
          
          {/* URL de la miniature */}
          <Input
            type="url"
            value={formData.thumbnail_url}
            onChange={(e) => handleInputChange('thumbnail_url', e.target.value)}
            placeholder="https://example.com/thumbnail.jpg"
          />
          
          {/* Upload de fichier */}
          <div className="border-2 border-dashed border-border rounded-lg p-4">
            <div className="text-center">
              <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mt-1">
                Ou uploadez une nouvelle image
              </p>
              <Input
                type="file"
                accept="image/*"
                onChange={handleThumbnailFileSelect}
                className="mt-2"
              />
              {selectedThumbnailFile && (
                <p className="mt-2 text-sm text-green-600">
                  Nouveau fichier: {selectedThumbnailFile.name}
                </p>
              )}
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

      
      <div className="flex space-x-2">
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
