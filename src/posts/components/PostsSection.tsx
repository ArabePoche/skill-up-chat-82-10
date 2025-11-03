
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Share, MoreHorizontal, User, Briefcase, Info, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { usePosts } from '@/posts/hooks/usePosts';
import CreatePostModal from '@/posts/components/CreatePostModal';
import PostCard from '@/posts/components/PostCard';
import { useTranslation } from 'react-i18next';

const PostsSection: React.FC<{ targetPostId?: string }> = ({ targetPostId }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [activeFilter, setActiveFilter] = useState<'all' | 'recruitment' | 'info' | 'annonce' | 'formation' | 'religion'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPost, setEditingPost] = useState<any>(null);
  const [visiblePostId, setVisiblePostId] = useState<string | null>(null);
  const { user, profile } = useAuth();
  const { data: posts, isLoading } = usePosts(activeFilter);
  const postRefs = useRef<(HTMLDivElement | null)[]>([]);

  const handleEditPost = (post: any) => {
    setEditingPost(post);
    setShowCreateModal(true);
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setEditingPost(null);
  };

  // Détecter le post visible et mettre à jour la route
  useEffect(() => {
    if (!posts || posts.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            const postId = entry.target.getAttribute('data-post-id');
            if (postId) {
              setVisiblePostId(postId);
            }
          }
        });
      },
      { threshold: 0.5 }
    );

    postRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, [posts]);

  // Effacer l'ID de la route quand on scrolle vers un autre post
  useEffect(() => {
    if (!targetPostId) return;
    
    // Si le post visible n'est plus le post ciblé, revenir à /post
    if (visiblePostId && visiblePostId !== targetPostId) {
      navigate('/post', { replace: true });
    }
  }, [visiblePostId, targetPostId, navigate]);

  // Scroller automatiquement vers le post ciblé
  useEffect(() => {
    if (!targetPostId || !posts) return;
    
    // Attendre que le DOM soit mis à jour
    const timer = setTimeout(() => {
      const el = document.getElementById(`post-${targetPostId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Ajouter un effet de highlight temporaire
        el.style.transition = 'background-color 0.3s';
        el.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
        setTimeout(() => {
          el.style.backgroundColor = '';
        }, 2000);
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [targetPostId, posts]);

  const filterButtons = [
    { key: 'all' as const, label: t('posts.filterAll'), icon: Users },
    { key: 'info' as const, label: t('posts.filterInfo'), icon: Info },
    { key: 'recruitment' as const, label: t('posts.filterRecruitment'), icon: Briefcase },
    { key: 'annonce' as const, label: t('posts.filterAnnouncement'), icon: Info },
    { key: 'formation' as const, label: t('posts.filterFormation'), icon: Info },
    { key: 'religion' as const, label: t('posts.filterReligion'), icon: Info },
  ];

  if (isLoading) {
    return (
      <div className="p-4 pt-20">
        <div className="flex items-center justify-center py-12">
          <div className="text-white">{t('posts.loading')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pt-20 pb-20 bg-white min-h-screen">
      {/* Header avec filtres */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-white text-xl font-bold">{t('posts.title')}</h1>
          {user && (
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-edu-primary hover:bg-edu-primary/90 text-white"
              size="sm"
            >
              {t('posts.createPost')}
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
                {t('posts.whatsNew')}
              </button>
            ) : (
              <div className="flex-1 bg-gray-800 text-gray-500 px-4 py-2 rounded-full cursor-not-allowed">
                {t('posts.loginToShare')}
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
          posts.map((post: any, index: number) => (
            <div 
              key={post.id} 
              ref={(el) => (postRefs.current[index] = el)}
              data-post-id={post.id}
            >
              <PostCard post={post} onEdit={handleEditPost} />
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              {activeFilter === 'all' 
                ? t('posts.noPosts')
                : t('posts.noPostsType', { type: filterButtons.find(f => f.key === activeFilter)?.label })
              }
            </div>
            {user && (
              <Button
                onClick={() => setShowCreateModal(true)}
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                {t('posts.createFirstPost')}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Modal de création/édition */}
      {showCreateModal && user && (
        <CreatePostModal
          isOpen={showCreateModal}
          onClose={handleCloseModal}
          editPost={editingPost}
        />
      )}
    </div>
  );
};

export default PostsSection;