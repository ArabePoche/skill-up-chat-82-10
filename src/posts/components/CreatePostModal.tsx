import React, { useState, useEffect } from 'react';
import { X, Image, Briefcase, Info, Star, Trash2, Megaphone, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useCreatePost, useUpdatePost } from '@/posts/hooks/usePosts';
import { toast } from 'sonner';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  editPost?: any;
}

const CreatePostModal: React.FC<CreatePostModalProps> = ({ isOpen, onClose, editPost }) => {
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState<'recruitment' | 'info' | 'annonce' | 'formation' | 'religion' | 'general' | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const { user } = useAuth();
  const { mutate: createPost, isPending: isCreating } = useCreatePost();
  const { mutate: updatePost, isPending: isUpdating } = useUpdatePost();
  const isPending = isCreating || isUpdating;

  // Charger les données du post à éditer
  useEffect(() => {
    if (editPost) {
      setContent(editPost.content || '');
      setPostType(editPost.post_type || null);
      // Pour l'instant on ne charge pas les images existantes
      // car la modification d'images nécessiterait plus de logique
    } else {
      setContent('');
      setPostType(null);
      setImageFiles([]);
      setImagePreviews([]);
    }
  }, [editPost]);

  const postTypes = [
    { value: 'info' as const, label: 'Information', icon: Info, color: 'text-green-400' },
    { value: 'recruitment' as const, label: 'Recrutement', icon: Briefcase, color: 'text-blue-400' },
    { value: 'annonce' as const, label: 'Annonce', icon: Megaphone, color: 'text-yellow-400' },
    { value: 'formation' as const, label: 'Formation', icon: GraduationCap, color: 'text-purple-400' },
    { value: 'religion' as const, label: 'Religion', icon: Star, color: 'text-amber-400' },
    { value: 'general' as const, label: 'Autre', icon: Star, color: 'text-amber-400' },
  ];

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Vérifier le nombre total de fichiers (max 5)
    if (imageFiles.length + files.length > 5) {
      toast.error('Maximum 5 images autorisées');
      return;
    }
    
    // Vérifier la taille de chaque fichier (5MB max)
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`L'image ${file.name} ne doit pas dépasser 5MB`);
        return;
      }
    }
    
    const newFiles = [...imageFiles, ...files];
    setImageFiles(newFiles);
    
    // Créer les aperçus
    const newPreviews = [...imagePreviews];
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        newPreviews.push(e.target?.result as string);
        if (newPreviews.length === newFiles.length) {
          setImagePreviews(newPreviews);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    const newFiles = imageFiles.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    setImageFiles(newFiles);
    setImagePreviews(newPreviews);
  };

  const handleSubmit = () => {
    if (!user) {
      toast.error('Vous devez être connecté pour créer un post');
      return;
    }

    if (!content.trim()) {
      toast.error("Le contenu du post ne peut pas être vide");
      return;
    }

    if (!postType) {
      toast.error('Veuillez choisir une catégorie');
      return;
    }

    if (editPost) {
      // Mode édition
      updatePost({
        postId: editPost.id,
        content: content.trim(),
        postType,
        imageFiles: imageFiles.length > 0 ? imageFiles : undefined,
      }, {
        onSuccess: () => {
          setContent('');
          setPostType(null);
          setImageFiles([]);
          setImagePreviews([]);
          onClose();
        }
      });
    } else {
      // Mode création
      createPost({
        content: content.trim(),
        postType,
        imageFiles: imageFiles,
        authorId: user.id
      }, {
        onSuccess: () => {
          setContent('');
          setPostType(null);
          setImageFiles([]);
          setImagePreviews([]);
          onClose();
        }
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-white text-lg font-semibold">
            {editPost ? 'Modifier le post' : 'Créer un post'}
          </h2>
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
              Catégorie (obligatoire)
            </label>
            <div className="flex flex-wrap gap-2">
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

          {/* Images */}
          <div>
            <label className="text-white text-sm font-medium mb-2 block">
              Images (optionnel - max 5)
            </label>
            
            {/* Upload button */}
            <div className="flex items-center space-x-3 mb-3">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                className="hidden"
                id="image-upload"
                disabled={imageFiles.length >= 5}
              />
              <label
                htmlFor="image-upload"
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                  imageFiles.length >= 5 
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                    : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                }`}
              >
                <Image size={16} className="text-gray-400" />
                <span className="text-sm">
                  {imageFiles.length >= 5 ? 'Maximum atteint' : 'Ajouter des images'}
                </span>
              </label>
              {imageFiles.length > 0 && (
                <span className="text-sm text-gray-400">
                  {imageFiles.length}/5 image{imageFiles.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
            
            {/* Aperçus des images */}
            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative">
                    <img 
                      src={preview} 
                      alt={`Aperçu ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                    <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                      {imageFiles[index]?.name}
                    </div>
                  </div>
                ))}
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
            disabled={!content.trim() || !postType || isPending}
            className="bg-edu-primary hover:bg-edu-primary/90 text-white"
          >
            {isPending ? (editPost ? 'Modification...' : 'Publication...') : (editPost ? 'Modifier' : 'Publier')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreatePostModal;