
import React, { useState } from 'react';
import { X, Camera, Type, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useCreateStory } from '@/hooks/useStories';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface CreateStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CreateStoryModal: React.FC<CreateStoryModalProps> = ({ isOpen, onClose }) => {
  const [contentType, setContentType] = useState<'text' | 'image' | 'video'>('text');
  const [textContent, setTextContent] = useState('');
  const [backgroundColor, setBackgroundColor] = useState('#25d366');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  
  const { user } = useAuth();
  const createStory = useCreateStory();

  const backgroundColors = [
    '#25d366', '#128C7E', '#075E54', '#34B7F1', '#9C27B0',
    '#E91E63', '#F44336', '#FF9800', '#4CAF50', '#2196F3'
  ];

  const handleFileUpload = async (file: File) => {
    if (!user) return null;

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('story-media')
      .upload(fileName, file);

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('story-media')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  };

  const handleSubmit = async () => {
    try {
      setUploading(true);
      
      let mediaUrl = null;
      if (mediaFile) {
        mediaUrl = await handleFileUpload(mediaFile);
      }

      await createStory.mutateAsync({
        content_type: contentType,
        content_text: contentType === 'text' ? textContent : undefined,
        media_url: mediaUrl,
        background_color: contentType === 'text' ? backgroundColor : undefined
      });

      onClose();
      setTextContent('');
      setMediaFile(null);
      setContentType('text');
    } catch (error) {
      console.error('Error creating story:', error);
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Créer un statut</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X size={20} />
          </Button>
        </div>

        {/* Type de contenu */}
        <div className="flex space-x-2 mb-4">
          <Button
            variant={contentType === 'text' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setContentType('text')}
          >
            <Type size={16} className="mr-1" />
            Texte
          </Button>
          <Button
            variant={contentType === 'image' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setContentType('image')}
          >
            <Camera size={16} className="mr-1" />
            Image
          </Button>
          <Button
            variant={contentType === 'video' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setContentType('video')}
          >
            <Camera size={16} className="mr-1" />
            Vidéo
          </Button>
        </div>

        {/* Contenu texte */}
        {contentType === 'text' && (
          <>
            <Textarea
              placeholder="Écrivez votre statut..."
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              className="mb-4"
              rows={4}
            />
            
            {/* Couleurs de fond */}
            <div className="mb-4">
              <p className="text-sm font-medium mb-2">Couleur de fond :</p>
              <div className="flex flex-wrap gap-2">
                {backgroundColors.map((color) => (
                  <button
                    key={color}
                    className={`w-8 h-8 rounded-full border-2 ${
                      backgroundColor === color ? 'border-gray-800' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setBackgroundColor(color)}
                  />
                ))}
              </div>
            </div>

            {/* Aperçu */}
            <div 
              className="w-full h-32 rounded-lg flex items-center justify-center mb-4"
              style={{ backgroundColor }}
            >
              <p className="text-white text-center px-4">
                {textContent || 'Votre texte apparaîtra ici...'}
              </p>
            </div>
          </>
        )}

        {/* Upload de fichier */}
        {(contentType === 'image' || contentType === 'video') && (
          <div className="mb-4">
            <Input
              type="file"
              accept={contentType === 'image' ? 'image/*' : 'video/*'}
              onChange={(e) => setMediaFile(e.target.files?.[0] || null)}
              className="mb-2"
            />
            {mediaFile && (
              <p className="text-sm text-gray-600">
                Fichier sélectionné : {mediaFile.name}
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex space-x-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Annuler
          </Button>
          <Button 
            onClick={handleSubmit} 
            className="flex-1"
            disabled={uploading || (contentType === 'text' && !textContent) || ((contentType === 'image' || contentType === 'video') && !mediaFile)}
          >
            {uploading ? 'Publication...' : 'Publier'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateStoryModal;
