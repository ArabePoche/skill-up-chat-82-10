
import React, { useState } from 'react';
import { X, Image, Briefcase, Info, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useCreatePost } from '@/hooks/usePosts';
import { toast } from 'sonner';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CreatePostModal: React.FC<CreatePostModalProps> = ({ isOpen, onClose }) => {
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState<'recruitment' | 'info' | 'general'>('general');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const { user } = useAuth();
  const { mutate: createPost, isPending } = useCreatePost();

  const postTypes = [
    { value: 'general' as const, label: 'Général', icon: MessageCircle, color: 'text-gray-400' },
    { value: 'recruitment' as const, label: 'Recrutement', icon: Briefcase, color: 'text-blue-400' },
    { value: 'info' as const, label: 'Information', icon: Info, color: 'text-green-400' },
  ];

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB max
        toast.error('L\'image ne doit pas dépasser 5MB');
        return;
      }
      
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    if (!user) {
      toast.error('Vous devez être connecté pour créer un post');
      return;
    }

    if (!content.trim()) {
      toast.error('Le contenu du post ne peut pas être vide');
      return;
    }

    createPost({
      content: content.trim(),
      postType,
      imageFile,
      authorId: user.id
    }, {
      onSuccess: () => {
        toast.success('Post créé avec succès !');
        setContent('');
        setPostType('general');
        setImageFile(null);
        setImagePreview(null);
        onClose();
      },
      onError: (error) => {
        console.error('Error creating post:', error);
        toast.error('Erreur lors de la création du post');
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-white text-lg font-semibold">Créer un post</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X size={20} />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Type de post */}
          <div>
            <label className="text-white text-sm font-medium mb-2 block">
              Type de publication
            </label>
            <div className="flex space-x-2">
              {postTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.value}
                    onClick={() => setPostType(type.value)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                      postType === type.value
                        ? 'bg-edu-primary text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    <Icon size={16} className={postType === type.value ? 'text-white' : type.color} />
                    <span>{type.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Contenu */}
          <div>
            <label className="text-white text-sm font-medium mb-2 block">
              Contenu
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Quoi de neuf ?"
              className="w-full h-32 bg-gray-800 border border-gray-700 rounded-lg p-3 text-white placeholder-gray-400 focus:outline-none focus:border-edu-primary resize-none"
              maxLength={500}
            />
            <div className="text-right text-xs text-gray-400 mt-1">
              {content.length}/500
            </div>
          </div>

          {/* Image */}
          <div>
            <label className="text-white text-sm font-medium mb-2 block">
              Image (optionnel)
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
                id="image-upload"
              />
              <label
                htmlFor="image-upload"
                className="flex items-center space-x-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg cursor-pointer transition-colors"
              >
                <Image size={16} className="text-gray-400" />
                <span className="text-gray-300 text-sm">Ajouter une image</span>
              </label>
              {imageFile && (
                <span className="text-sm text-gray-400">{imageFile.name}</span>
              )}
            </div>
            
            {imagePreview && (
              <div className="mt-3 relative">
                <img 
                  src={imagePreview} 
                  alt="Aperçu"
                  className="w-full h-40 object-cover rounded-lg"
                />
                <button
                  onClick={() => {
                    setImageFile(null);
                    setImagePreview(null);
                  }}
                  className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-4 border-t border-gray-800">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!content.trim() || isPending}
            className="bg-edu-primary hover:bg-edu-primary/90 text-white"
          >
            {isPending ? 'Publication...' : 'Publier'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreatePostModal;
