import React, { useState } from 'react';
import { X, Edit, Trash2, Flag } from 'lucide-react';
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
  const { user } = useAuth();
  const { mutate: updatePost, isPending: isUpdating } = useUpdatePost();
  const { mutate: deletePost, isPending: isDeleting } = useDeletePost();

  const isAuthor = user?.id === post.author_id;

  const handleEdit = () => {
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    updatePost({
      postId: post.id,
      content: editContent,
      postType: editPostType
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
    { value: 'annonce' as const, label: 'Annonce' },
    { value: 'formation' as const, label: 'Formation' },
    { value: 'religion' as const, label: 'Religion' },
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