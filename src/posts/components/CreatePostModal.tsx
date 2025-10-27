import React, { useState, useEffect } from 'react';
import { X, Image, Briefcase, Info, Star, Trash2, Megaphone, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useCreatePost, useUpdatePost } from '@/posts/hooks/usePosts';
import { toast } from 'sonner';
import { compressImage, formatFileSize } from '@/utils/imageCompression';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const [existingMedia, setExistingMedia] = useState<Array<{id: string; file_url: string; file_type: string}>>([]);
  const [removedMediaIds, setRemovedMediaIds] = useState<string[]>([]);
  const [removeMainImage, setRemoveMainImage] = useState(false);
  const [compressionDialog, setCompressionDialog] = useState<{
    open: boolean;
    files: File[];
    originalSizes: number[];
  }>({ open: false, files: [], originalSizes: [] });
  const { user } = useAuth();
  const { mutate: createPost, isPending: isCreating } = useCreatePost();
  const { mutate: updatePost, isPending: isUpdating } = useUpdatePost();
  const isPending = isCreating || isUpdating;

  // Charger les données du post à éditer
  useEffect(() => {
    if (editPost) {
      setContent(editPost.content || '');
      setPostType(editPost.post_type || null);
      // Charger les médias existants (post_media)
      if (editPost.media && Array.isArray(editPost.media)) {
        setExistingMedia(editPost.media.map((m: any) => ({
          id: m.id,
          file_url: m.file_url,
          file_type: m.file_type
        })));
      } else {
        setExistingMedia([]);
      }
      setImageFiles([]);
      setImagePreviews([]);
      setRemovedMediaIds([]);
      setRemoveMainImage(false);
    } else {
      setContent('');
      setPostType(null);
      setImageFiles([]);
      setImagePreviews([]);
      setExistingMedia([]);
      setRemovedMediaIds([]);
      setRemoveMainImage(false);
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

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Calculer le nombre total d'images (existantes non supprimées + nouvelles)
    const currentImageCount = existingMedia.length - removedMediaIds.length + imageFiles.length;
    
    // Vérifier le nombre total de fichiers (max 5)
    if (currentImageCount + files.length > 5) {
      toast.error('Maximum 5 images autorisées');
      return;
    }
    
    // Séparer les fichiers selon leur taille
    const oversizedFiles: File[] = [];
    const validFiles: File[] = [];
    const oversizedSizes: number[] = [];
    
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        oversizedFiles.push(file);
        oversizedSizes.push(file.size);
      } else {
        validFiles.push(file);
      }
    }
    
    // Si des fichiers dépassent 5MB, proposer la compression
    if (oversizedFiles.length > 0) {
      setCompressionDialog({
        open: true,
        files: oversizedFiles,
        originalSizes: oversizedSizes,
      });
      
      // Ajouter directement les fichiers valides
      if (validFiles.length > 0) {
        await addFilesToPreview(validFiles);
      }
      return;
    }
    
    // Tous les fichiers sont valides
    await addFilesToPreview(files);
  };

  const addFilesToPreview = async (files: File[]) => {
    const newFiles = [...imageFiles, ...files];
    setImageFiles(newFiles);
    
    // Créer les aperçus
    const newPreviews = [...imagePreviews];
    for (const file of files) {
      const reader = new FileReader();
      const preview = await new Promise<string>((resolve) => {
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });
      newPreviews.push(preview);
    }
    setImagePreviews(newPreviews);
  };

  const handleCompressAndAdd = async () => {
    const { files } = compressionDialog;
    
    try {
      toast.loading('Compression des images en cours...');
      
      const compressedFiles: File[] = [];
      for (const file of files) {
        const compressed = await compressImage(file);
        compressedFiles.push(compressed);
      }
      
      toast.dismiss();
      toast.success(`${compressedFiles.length} image(s) compressée(s) avec succès`);
      
      await addFilesToPreview(compressedFiles);
      setCompressionDialog({ open: false, files: [], originalSizes: [] });
    } catch (error) {
      toast.dismiss();
      toast.error('Erreur lors de la compression des images');
      console.error('Compression error:', error);
      setCompressionDialog({ open: false, files: [], originalSizes: [] });
    }
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
        removedMediaIds: removedMediaIds.length > 0 ? removedMediaIds : undefined,
        removeImage: removeMainImage,
      }, {
        onSuccess: () => {
          setContent('');
          setPostType(null);
          setImageFiles([]);
          setImagePreviews([]);
          setExistingMedia([]);
          setRemovedMediaIds([]);
          setRemoveMainImage(false);
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
    <>
      {/* Dialog de compression */}
      <AlertDialog open={compressionDialog.open} onOpenChange={(open) => !open && setCompressionDialog({ open: false, files: [], originalSizes: [] })}>
        <AlertDialogContent className="bg-gray-900 border-gray-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              Images trop volumineuses
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              {compressionDialog.files.length > 1 ? (
                <>
                  {compressionDialog.files.length} images dépassent 5 MB :
                  <ul className="mt-2 space-y-1">
                    {compressionDialog.files.map((file, index) => (
                      <li key={index} className="text-sm">
                        • {file.name} ({formatFileSize(compressionDialog.originalSizes[index])})
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <>
                  L'image <strong>{compressionDialog.files[0]?.name}</strong> ({formatFileSize(compressionDialog.originalSizes[0])}) dépasse la limite de 5 MB.
                </>
              )}
              <p className="mt-3">
                Voulez-vous compresser {compressionDialog.files.length > 1 ? 'ces images' : 'cette image'} automatiquement ?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-800 text-gray-300 hover:bg-gray-700 border-gray-700">
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCompressAndAdd}
              className="bg-edu-primary hover:bg-edu-primary/90 text-white"
            >
              Compresser
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal principale */}
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

            {/* Images existantes (mode édition) */}
            {editPost && existingMedia.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs text-gray-400 mb-2">Images existantes</h4>
                <div className="grid grid-cols-2 gap-3">
                  {existingMedia.map((media) => {
                    const isMarkedForRemoval = removedMediaIds.includes(media.id);
                    return (
                      <div key={media.id} className="relative group">
                        <img 
                          src={media.file_url} 
                          alt="Média existant"
                          className={`w-full h-32 object-cover rounded-lg ${isMarkedForRemoval ? 'opacity-50 grayscale' : ''}`}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setRemovedMediaIds(prev => 
                              isMarkedForRemoval 
                                ? prev.filter(id => id !== media.id)
                                : [...prev, media.id]
                            );
                          }}
                          className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition"
                        >
                          {isMarkedForRemoval ? 'Annuler' : 'Supprimer'}
                        </button>
                        {isMarkedForRemoval && (
                          <span className="absolute bottom-2 left-2 bg-red-600/80 text-white text-[10px] px-1.5 py-0.5 rounded">
                            À supprimer
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Image principale (legacy) */}
            {editPost && editPost.image_url && !removeMainImage && (
              <div className="mb-3">
                <h4 className="text-xs text-gray-400 mb-2">Image principale</h4>
                <div className="relative">
                  <img 
                    src={editPost.image_url} 
                    alt="Image principale"
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => setRemoveMainImage(true)}
                    className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            )}
            
            {/* Upload de nouvelles images */}
            <div className="flex items-center space-x-3 mb-3">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                className="hidden"
                id="image-upload"
                disabled={imageFiles.length + existingMedia.length - removedMediaIds.length >= 5}
              />
              <label
                htmlFor="image-upload"
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                  imageFiles.length + existingMedia.length - removedMediaIds.length >= 5
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                    : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                }`}
              >
                <Image size={16} className="text-gray-400" />
                <span className="text-sm">
                  {imageFiles.length + existingMedia.length - removedMediaIds.length >= 5 ? 'Maximum atteint' : 'Ajouter des images'}
                </span>
              </label>
              {(imageFiles.length > 0 || existingMedia.length > 0) && (
                <span className="text-sm text-gray-400">
                  {imageFiles.length + existingMedia.length - removedMediaIds.length}/5 image(s)
                </span>
              )}
            </div>
            
            {/* Aperçus des nouvelles images */}
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
                      Nouvelle image
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
    </>
  );
};

export default CreatePostModal;