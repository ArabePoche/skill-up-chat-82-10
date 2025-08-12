
import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, Share, MoreHorizontal, User, Briefcase, Info, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { usePosts } from '@/hooks/usePosts';
import CreatePostModal from '@/components/CreatePostModal';
import PostCard from '@/components/PostCard';

const PostsSection: React.FC<{ targetPostId?: string }> = ({ targetPostId }) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'recruitment' | 'info' | 'annonce' | 'formation' | 'religion'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { user, profile } = useAuth();
  const { data: posts, isLoading } = usePosts(activeFilter);

  useEffect(() => {
    if (!targetPostId || !posts) return;
    const el = document.getElementById(`post-${targetPostId}`);
    if (el) el.scrollIntoView({ behavior: 'auto', block: 'start' });
  }, [targetPostId, posts]);

  const filterButtons = [
    { key: 'all' as const, label: 'Tous', icon: Users },
    { key: 'info' as const, label: 'Information', icon: Info },
    { key: 'recruitment' as const, label: 'Recrutement', icon: Briefcase },
    { key: 'annonce' as const, label: 'Annonce', icon: Info },
    { key: 'formation' as const, label: 'Formation', icon: Info },
    { key: 'religion' as const, label: 'Religion', icon: Info },
  ];

  if (isLoading) {
    return (
      <div className="p-4 pt-20">
        <div className="flex items-center justify-center py-12">
          <div className="text-white">Chargement des posts...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pt-20 pb-20 bg-black min-h-screen">
      {/* Header avec filtres */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-white text-xl font-bold">Publications</h1>
          {user && (
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-edu-primary hover:bg-edu-primary/90 text-white"
              size="sm"
            >
              Créer un post
            </Button>
          )}
        </div>

        {/* Composer "Quoi de neuf ?" - Toujours visible */}
        <div className="bg-gray-900 rounded-lg p-4 border border-gray-800 mb-4 animate-fade-in">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
              {profile?.avatar_url ? (
                <img 
                  src={profile.avatar_url} 
                  alt="Avatar"
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <User size={20} className="text-gray-300" />
              )}
            </div>
            {user ? (
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex-1 text-left bg-gray-800 hover:bg-gray-700 text-gray-400 px-4 py-2 rounded-full transition-colors"
              >
                Quoi de neuf ?
              </button>
            ) : (
              <div className="flex-1 bg-gray-800 text-gray-500 px-4 py-2 rounded-full cursor-not-allowed">
                Connectez-vous pour partager quelque chose...
              </div>
            )}
          </div>
        </div>

        {/* Filtres */}
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {filterButtons.map((filter) => {
            const Icon = filter.icon;
            return (
              <button
                key={filter.key}
                onClick={() => setActiveFilter(filter.key)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  activeFilter === filter.key
                    ? 'bg-edu-primary text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                <Icon size={16} />
                <span>{filter.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Liste des posts */}
      <div className="space-y-4">
        {posts && posts.length > 0 ? (
          posts.map((post: any) => (
            <PostCard key={post.id} post={post} />
          ))
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              {activeFilter === 'all' 
                ? 'Aucune publication pour le moment' 
                : `Aucune publication de type "${filterButtons.find(f => f.key === activeFilter)?.label}" pour le moment`
              }
            </div>
            {user && (
              <Button
                onClick={() => setShowCreateModal(true)}
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                Créer le premier post
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Modal de création */}
      {showCreateModal && user && (
        <CreatePostModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
};

export default PostsSection;