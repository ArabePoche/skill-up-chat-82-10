import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useFormations } from '@/hooks/useFormations';
import { Upload, Link as LinkIcon } from 'lucide-react';

interface EnhancedVideoCreateFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const EnhancedVideoCreateForm: React.FC<EnhancedVideoCreateFormProps> = ({ onSuccess, onCancel }) => {
  const { user, profile } = useAuth();
  const { uploadFile, isUploading } = useFileUpload();
  const { data: allFormations = [] } = useFormations();
  
  // Filtrer les formations selon le rôle de l'utilisateur
  const formations = React.useMemo(() => {
    // Si admin, afficher toutes les formations
    if (profile?.role === 'admin') {
      return allFormations;
    }
    // Sinon, afficher uniquement les formations dont l'utilisateur est auteur
    return allFormations.filter(formation => formation.author_id === user?.id);
  }, [allFormations, profile?.role, user?.id]);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    video_url: '',
    thumbnail_url: '',
    video_type: 'classic' as 'lesson' | 'promo' | 'classic',
    formation_id: '',
  });
  
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
  const [selectedThumbnailFile, setSelectedThumbnailFile] = useState<File | null>(null);
  const [uploadMethod, setUploadMethod] = useState<'url' | 'upload'>('url');

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleVideoFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Vérifier que c'est bien une vidéo
      if (!file.type.startsWith('video/')) {
        toast.error('Veuillez sélectionner un fichier vidéo');
        return;
      }
      setSelectedVideoFile(file);
    }
  };

  const handleThumbnailFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Vérifier que c'est bien une image
      if (!file.type.startsWith('image/')) {
        toast.error('Veuillez sélectionner un fichier image');
        return;
      }
      setSelectedThumbnailFile(file);
    }
  };

  const uploadVideoFile = async (file: File): Promise<string> => {
    try {
      const result = await uploadFile(file, 'lesson_discussion_files');
      return result.fileUrl;
    } catch (error) {
      console.error('Erreur upload vidéo:', error);
      throw error;
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

    if (!formData.title.trim()) {
      toast.error('Le titre est requis');
      return;
    }

    // Vérifier qu'on a soit une URL soit un fichier pour la vidéo
    if (uploadMethod === 'url' && !formData.video_url.trim()) {
      toast.error('Veuillez saisir l\'URL de la vidéo');
      return;
    }

    if (uploadMethod === 'upload' && !selectedVideoFile) {
      toast.error('Veuillez sélectionner un fichier vidéo');
      return;
    }

    // Vérifier que pour une vidéo promo ou leçon, une formation est sélectionnée
    if ((formData.video_type === 'promo' || formData.video_type === 'lesson') && !formData.formation_id.trim()) {
      toast.error('Veuillez sélectionner une formation pour ce type de vidéo');
      return;
    }

    try {
      let videoUrl = formData.video_url;
      let thumbnailUrl = formData.thumbnail_url;

      // Uploader la vidéo si un fichier est sélectionné
      if (uploadMethod === 'upload' && selectedVideoFile) {
        console.log('Upload de la vidéo:', selectedVideoFile.name);
        videoUrl = await uploadVideoFile(selectedVideoFile);
        console.log('Vidéo uploadée:', videoUrl);
      }

      // Uploader la miniature si un fichier est sélectionné
      if (selectedThumbnailFile) {
        console.log('Upload de la miniature:', selectedThumbnailFile.name);
        thumbnailUrl = await uploadThumbnailFile(selectedThumbnailFile);
        console.log('Miniature uploadée:', thumbnailUrl);
      }

      const videoData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        video_url: videoUrl,
        thumbnail_url: thumbnailUrl || null,
        video_type: formData.video_type,
        formation_id: formData.formation_id.trim() || null,
        author_id: user?.id,
      };

      console.log('Création vidéo avec données:', videoData);

      const { data: created, error } = await supabase
        .from('videos')
        .insert(videoData)
        .select()
        .maybeSingle();

      if (error) {
        console.error('Erreur création vidéo:', error);
        throw error;
      }

      if (!created) {
        toast.error("Création non appliquée (pas d'autorisation ou données invalides)");
        return;
      }
      
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

      {/* Onglets pour choisir entre URL et Upload */}
      <div>
        <Label>Vidéo</Label>
        <Tabs value={uploadMethod} onValueChange={(value) => setUploadMethod(value as 'url' | 'upload')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="url" className="flex items-center gap-2">
              <LinkIcon size={16} />
              URL
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload size={16} />
              Upload
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="url" className="mt-3">
            <Input
              type="url"
              value={formData.video_url}
              onChange={(e) => handleInputChange('video_url', e.target.value)}
              placeholder="https://example.com/video.mp4"
              required={uploadMethod === 'url'}
            />
          </TabsContent>
          
          <TabsContent value="upload" className="mt-3">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              <div className="text-center">
                <Upload className="mx-auto h-8 w-8 text-gray-400" />
                <Input
                  type="file"
                  accept="video/*"
                  onChange={handleVideoFileSelect}
                  className="mt-2"
                />
                {selectedVideoFile && (
                  <p className="mt-2 text-sm text-green-600">
                    Fichier sélectionné: {selectedVideoFile.name}
                  </p>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Miniature - URL ou Upload */}
      <div>
        <Label>Miniature (optionnel)</Label>
        <div className="space-y-2">
          <Input
            type="url"
            value={formData.thumbnail_url}
            onChange={(e) => handleInputChange('thumbnail_url', e.target.value)}
            placeholder="https://example.com/thumbnail.jpg ou uploadez un fichier ci-dessous"
          />
          <div className="border border-gray-300 rounded-lg p-2">
            <Input
              type="file"
              accept="image/*"
              onChange={handleThumbnailFileSelect}
              className="text-sm"
            />
            {selectedThumbnailFile && (
              <p className="mt-1 text-sm text-green-600">
                Fichier sélectionné: {selectedThumbnailFile.name}
              </p>
            )}
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
          <Label htmlFor="formation_id">
            Formation associée <span className="text-destructive">*</span>
          </Label>
          <Select
            value={formData.formation_id}
            onValueChange={(value) => handleInputChange('formation_id', value)}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner une formation" />
            </SelectTrigger>
            <SelectContent>
              {formations.length === 0 ? (
                <SelectItem value="no-formations" disabled>
                  Aucune formation disponible
                </SelectItem>
              ) : (
                formations.map((formation) => (
                  <SelectItem key={formation.id} value={formation.id}>
                    {formation.title}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {formations.length === 0 && (
            <p className="text-sm text-destructive mt-1">
              ⚠️ Vous devez d'abord créer une formation pour créer une vidéo {formData.video_type === 'promo' ? 'promotionnelle' : 'de leçon'}.
            </p>
          )}
        </div>
      )}

      <div className="flex space-x-2">
        <Button 
          type="submit" 
          className="flex-1" 
          disabled={
            isUploading || 
            (formations.length === 0 && (formData.video_type === 'promo' || formData.video_type === 'lesson'))
          }
        >
          {isUploading ? 'Upload en cours...' : 'Créer'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </form>
  );
};

export default EnhancedVideoCreateForm;