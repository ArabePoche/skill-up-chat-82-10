import React, { useState } from 'react';
import { X, Edit, Trash2, Flag, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useUpdatePost, useDeletePost } from '@/hooks/usePosts';

interface PostOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: {
    id: string;
    content: string;
    post_type: 'recruitment' | 'info' | 'annonce' | 'formation' | 'religion' | 'general';
    author_id: string;
    image_url?: string;
    media?: { id?: string; post_id?: string; file_url: string; file_type: string; order_index?: number }[];
    profiles: {
      first_name: string;
      last_name: string;
      username: string;
      avatar_url: string;
    };
  };
}

const PostOptionsModal: React.FC<PostOptionsModalProps> = ({ isOpen, onClose, post }) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [editPostType, setEditPostType] = useState(post.post_type);
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  const [removedMediaIds, setRemovedMediaIds] = useState<string[]>([]);
  const [removeImage, setRemoveImage] = useState(false);
  const { user } = useAuth();
  const { mutate: updatePost, isPending: isUpdating } = useUpdatePost();
  const { mutate: deletePost, isPending: isDeleting } = useDeletePost();

  const isAuthor = user?.id === post.author_id;

  // Gestion sélection multi-images (ajout)
  const handleNewImagesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((f) => f.size <= 5 * 1024 * 1024);
    const updated = [...newImageFiles, ...validFiles];
    setNewImageFiles(updated);

    const previews = [...newPreviews];
    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        previews.push(ev.target?.result as string);
        setNewPreviews([...previews]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeNewImageAt = (index: number) => {
    setNewImageFiles((prev) => prev.filter((_, i) => i !== index));
    setNewPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEdit = () => {
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    updatePost({
      postId: post.id,
      content: editContent,
      postType: editPostType,
      imageFiles: newImageFiles,
      removedMediaIds,
      removeImage
    }, {
      onSuccess: () => {
        setShowEditModal(false);
        onClose();
      }
    });
  };
  const handleDelete = () => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce post ?')) {
      deletePost(post.id, {
        onSuccess: () => {
          onClose();
        }
      });
    }
  };

  const postTypes = [
    { value: 'info' as const, label: 'Information' },
    { value: 'recruitment' as const, label: 'Recrutement' },
    { value: 'general' as const, label: 'Autre' },
  ];

  if (!isOpen) return null;

  if (showEditModal) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <h2 className="text-white text-lg font-semibold">Modifier le post</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowEditModal(false)}
              className="text-gray-400 hover:text-white"
            >
              <X size={20} />
            </Button>
          </div>

          <div className="p-4 space-y-4">
            <div>
              <label className="text-white text-sm font-medium mb-2 block">
                Catégorie
              </label>
              <div className="flex flex-wrap gap-2">
                {postTypes.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setEditPostType(type.value)}
                    className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                      editPostType === type.value
                        ? 'bg-edu-primary text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-white text-sm font-medium mb-2 block">
                Contenu
              </label>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full h-32 bg-gray-800 border border-gray-700 rounded-lg p-3 text-white placeholder-gray-400 focus:outline-none focus:border-edu-primary resize-none"
                maxLength={500}
              />
              <div className="text-right text-xs text-gray-400 mt-1">
                {editContent.length}/500
              </div>
            </div>

            {/* Médias (multi-images) */}
            <div>
              <label className="text-white text-sm font-medium mb-2 block">
                Médias
              </label>

              {/* Médias existants */}
              {Array.isArray(post.media) && post.media.filter(m => (m.file_type || '').startsWith('image')).length > 0 && (
                <div className="mb-4">
                  <h4 className="text-xs text-gray-400 mb-2">Images existantes</h4>
                  <div className="grid grid-cols-3 gap-3">
                    {post.media
                      ?.filter(m => (m.file_type || '').startsWith('image'))
                      .map((m) => {
                        const id = m.id as string | undefined;
                        const marked = id ? removedMediaIds.includes(id) : false;
                        return (
                          <div key={id || m.file_url} className="relative group">
                            <img
                              src={m.file_url}
                              alt="Média"
                              className={`w-full h-24 object-cover rounded ${marked ? 'opacity-50' : ''}`}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (!id) return;
                                setRemovedMediaIds((prev) =>
                                  prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
                                );
                              }}
                              className="absolute top-1 right-1 px-2 py-1 text-xs rounded bg-black/70 text-white opacity-0 group-hover:opacity-100 transition"
                            >
                              {marked ? 'Annuler' : 'Supprimer'}
                            </button>
                            {marked && (
                              <span className="absolute bottom-1 left-1 bg-red-600/80 text-white text-[10px] px-1.5 py-0.5 rounded">
                                À supprimer
                              </span>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Image principale héritée */}
              {post.image_url && !removeImage && (
                <div className="mb-3">
                  <h4 className="text-xs text-gray-400 mb-2">Image principale</h4>
                  <div className="rounded-lg overflow-hidden relative">
                    <img
                      src={post.image_url}
                      alt="Image principale"
                      className="w-full h-32 object-cover"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setRemoveImage(true)}
                    className="mt-2 px-3 py-2 rounded-lg bg-red-600/80 hover:bg-red-600 text-white text-sm"
                  >
                    Supprimer l'image principale
                  </button>
                </div>
              )}

              {/* Ajout de nouvelles images */}
              <div className="mb-2">
                <div className="flex items-center gap-3 mb-2">
                  <input
                    id="edit-add-images"
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleNewImagesSelect}
                  />
                  <label
                    htmlFor="edit-add-images"
                    className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 cursor-pointer transition-colors"
                  >
                    <ImageIcon size={16} className="text-gray-400" />
                    <span className="text-sm">Ajouter des images</span>
                  </label>
                  {newImageFiles.length > 0 && (
                    <span className="text-xs text-gray-400">{newImageFiles.length} sélectionnée(s)</span>
                  )}
                </div>

                {newPreviews.length > 0 && (
                  <div className="grid grid-cols-3 gap-3">
                    {newPreviews.map((src, idx) => (
                      <div key={idx} className="relative group">
                        <img src={src} alt={`Nouvelle ${idx + 1}`} className="w-full h-24 object-cover rounded" />
                        <button
                          type="button"
                          onClick={() => removeNewImageAt(idx)}
                          className="absolute top-1 right-1 p-1 rounded bg-red-600/80 text-white opacity-0 group-hover:opacity-100 transition"
                          aria-label="Retirer l'image"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-xs text-gray-500 mt-2">Formats JPG/PNG, 5MB max par image.</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 p-4 border-t border-gray-800">
            <Button
              variant="outline"
              onClick={() => setShowEditModal(false)}
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Annuler
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={!editContent.trim() || isUpdating}
              className="bg-edu-primary hover:bg-edu-primary/90 text-white"
            >
              {isUpdating ? 'Modification...' : 'Modifier'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg w-full max-w-sm">
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-white text-lg font-semibold">Options du post</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X size={20} />
          </Button>
        </div>

        <div className="p-4 space-y-2">
          {isAuthor && (
            <>
              <button
                onClick={handleEdit}
                className="w-full flex items-center space-x-3 p-3 text-left text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <Edit size={20} />
                <span>Modifier</span>
              </button>
              
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="w-full flex items-center space-x-3 p-3 text-left text-red-400 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <Trash2 size={20} />
                <span>{isDeleting ? 'Suppression...' : 'Supprimer'}</span>
              </button>
            </>
          )}
          
          {!isAuthor && (
            <button
              onClick={() => {
                // TODO: Implémenter le signalement
                onClose();
              }}
              className="w-full flex items-center space-x-3 p-3 text-left text-yellow-400 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <Flag size={20} />
              <span>Signaler</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostOptionsModal;