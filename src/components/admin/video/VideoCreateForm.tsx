import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface VideoCreateFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const VideoCreateForm: React.FC<VideoCreateFormProps> = ({ onSuccess, onCancel }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    video_url: '',
    thumbnail_url: '',
    video_type: 'classic' as 'lesson' | 'promo' | 'classic',
    formation_id: '',
    price: '',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.video_url.trim()) {
      toast.error('Le titre et l\'URL de la vidéo sont requis');
      return;
    }

    // Vérifier que pour une vidéo promo, une formation est sélectionnée
    if (formData.video_type === 'promo' && !formData.formation_id.trim()) {
      toast.error('Veuillez sélectionner une formation pour une vidéo promo');
      return;
    }

    try {
      const videoData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        video_url: formData.video_url.trim(),
        thumbnail_url: formData.thumbnail_url.trim() || null,
        video_type: formData.video_type,
        formation_id: formData.formation_id.trim() || null,
        price: formData.price ? parseFloat(formData.price) : null,
        author_id: user?.id,
      };

      const { error } = await supabase
        .from('videos')
        .insert(videoData);

      if (error) throw error;
      
      toast.success('Vidéo créée avec succès');
      onSuccess();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erreur lors de la création');
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
        <Label htmlFor="thumbnail_url">URL de la miniature</Label>
        <Input
          id="thumbnail_url"
          type="url"
          value={formData.thumbnail_url}
          onChange={(e) => handleInputChange('thumbnail_url', e.target.value)}
          placeholder="https://example.com/thumbnail.jpg"
        />
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

      {formData.video_type === 'promo' && (
        <>
          <div>
            <Label htmlFor="formation_id">ID Formation</Label>
            <Input
              id="formation_id"
              value={formData.formation_id}
              onChange={(e) => handleInputChange('formation_id', e.target.value)}
              placeholder="UUID de la formation"
            />
          </div>

          <div>
            <Label htmlFor="price">Prix (€/mois)</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0"
              value={formData.price}
              onChange={(e) => handleInputChange('price', e.target.value)}
              placeholder="29.99"
            />
          </div>
        </>
      )}
      
      <div className="flex space-x-2">
        <Button type="submit" className="flex-1">
          Créer
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </form>
  );
};

export default VideoCreateForm;