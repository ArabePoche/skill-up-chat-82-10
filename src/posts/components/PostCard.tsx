
import React, { useState } from 'react';
import { Heart, MessageCircle, Share, MoreHorizontal, User, Edit, Trash2, Briefcase, Check } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import { useDeletePost } from '@/posts/hooks/usePosts';
import { usePostLikes } from '@/posts/hooks/usePostLikes';
import { useFollow } from '@/hooks/useFollow';
import PostComments from '@/posts/components/PostComments';
import PostImageModal from '@/posts/components/PostImageModal';
import PostLikesModal from '@/posts/components/PostLikesModal';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ApplicationModal } from '@/applications/components/ApplicationModal';
import { useCheckExistingApplication } from '@/applications/hooks/useApplications';

interface PostCardProps {
  post: any;
  onEdit?: (post: any) => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, onEdit }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const deletePost = useDeletePost();
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [openCommentsTick, setOpenCommentsTick] = useState(0);
  const [likesModalOpen, setLikesModalOpen] = useState(false);
  const [applicationModalOpen, setApplicationModalOpen] = useState(false);
  const commentsRef = React.useRef<HTMLDivElement>(null);

  const isAuthor = user?.id === post.author_id;
  const isRecruitmentPost = post.post_type === 'recruitment';
  
  // Hook pour le système d'amitié
  const { friendshipStatus, sendRequest, acceptRequest, cancelRequest, removeFriend, isLoading: isFollowLoading } = useFollow(post.author_id);

  // Vérifier si l'utilisateur a déjà postulé
  const { data: existingApplication } = useCheckExistingApplication(
    user?.id || '',
    post.id,
    'post',
  );

  // Hook pour les likes
  const { isLiked, likesCount, toggleLike, isLoading: isLikeLoading } = usePostLikes(
    post.id,
    post.likes_count || 0
  );

  // Compteur de commentaires dynamique
  const { data: commentsCount = post.comments_count || 0 } = useQuery({
    queryKey: ['post-comments-count', post.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('post_comments')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', post.id);

      if (error) {
        console.error('Erreur comptage commentaires post:', error);
        return post.comments_count || 0;
      }

      return count ?? (post.comments_count || 0);
    },
    enabled: !!post.id,
    refetchInterval: 3000,
  });

  // Récupérer toutes les images du post
  const allImages = React.useMemo(() => {
    const images = [];
    if (post.media && post.media.length > 0) {
      images.push(...post.media.map((m: any) => m.file_url));
    }
    if (post.image_url) {
      images.push(post.image_url);
    }
    return images;
  }, [post.media, post.image_url]);

  const openImageViewer = (index: number) => {
    setSelectedImageIndex(index);
    setImageViewerOpen(true);
  };

  const handleDelete = async () => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce post ?')) {
      await deletePost.mutateAsync(post.id);
    }
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(post);
    }
  };

  const handleComment = () => {
    setOpenCommentsTick((t) => t + 1);
    commentsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const handleShare = async () => {
    const postUrl = `${window.location.origin}/post/${post.id}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Partager ce post',
          url: postUrl,
        });
      } else {
        await navigator.clipboard.writeText(postUrl);
        toast.success('Lien copié dans le presse-papier');
      }
    } catch (error) {
      console.error('Erreur lors du partage:', error);
    }
  };

  const renderPostType = (type: string) => {
    const types = {
      recruitment: { label: 'Recrutement', color: 'bg-blue-600' },
      info: { label: 'Info', color: 'bg-green-600' },
      annonce: { label: 'Annonce', color: 'bg-yellow-600' },
      formation: { label: 'Formation', color: 'bg-purple-600' },
      religion: { label: 'Religion', color: 'bg-orange-600' },
      general: { label: 'Général', color: 'bg-gray-600' }
    };
    
    const typeInfo = types[type as keyof typeof types] || types.general;
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${typeInfo.color}`}>
        {typeInfo.label}
      </span>
    );
  };

  const renderMedia = () => {
    if (post.media && post.media.length > 0) {
      return (
        <div className="mt-3 grid gap-2 rounded-lg overflow-hidden">
          {post.media.length === 1 ? (
            <img
              src={post.media[0].file_url}
              alt="Post media"
              className="w-full h-auto max-h-96 object-cover cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => openImageViewer(0)}
            />
          ) : (
            <div className={`grid gap-2 ${post.media.length === 2 ? 'grid-cols-2' : 'grid-cols-2'}`}>
              {post.media.slice(0, 4).map((media: any, index: number) => (
                <div key={media.id} className="relative">
                  <img
                    src={media.file_url}
                    alt={`Media ${index + 1}`}
                    className="w-full h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity rounded-lg"
                    onClick={() => openImageViewer(index)}
                  />
                  {index === 3 && post.media.length > 4 && (
                    <div 
                      className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center cursor-pointer"
                      onClick={() => openImageViewer(3)}
                    >
                      <span className="text-white font-semibold">+{post.media.length - 4}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (post.image_url) {
      const imageIndex = post.media && post.media.length > 0 ? post.media.length : 0;
      return (
        <div className="mt-3">
          <img
            src={post.image_url}
            alt="Post image"
            className="w-full h-auto max-h-96 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => openImageViewer(imageIndex)}
          />
        </div>
      );
    }

    return null;
  };

  return (
    <div className="bg-gray-900 rounded-lg p-4 mb-4 border border-gray-800">
      {/* En-tête du post */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3 flex-1">
          <Avatar 
            className="w-10 h-10 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => post.author_id && navigate(`/profile/${post.author_id}`)}
          >
            <AvatarImage src={post.profiles?.avatar_url} />
            <AvatarFallback className="bg-gray-700 text-white">
              <User size={20} />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <span 
                className="font-semibold text-white cursor-pointer hover:underline"
                onClick={() => post.author_id && navigate(`/profile/${post.author_id}`)}
              >
                {post.profiles?.first_name || post.profiles?.username || 'Utilisateur'}
              </span>
              {renderPostType(post.post_type)}
            </div>
            <span className="text-sm text-gray-400">
              {formatDistanceToNow(new Date(post.created_at), {
                addSuffix: true,
                locale: fr
              })}
              {post.updated_at && new Date(post.updated_at).getTime() !== new Date(post.created_at).getTime() && (
                <span className="ml-2 text-xs text-gray-500 italic">• modifié</span>
              )}
            </span>
          </div>
          
          {/* Bouton demande d'amitié */}
          {!isAuthor && user && (
            <Button
              onClick={() => {
                if (friendshipStatus === 'friends') {
                  removeFriend();
                } else if (friendshipStatus === 'pending_sent') {
                  cancelRequest();
                } else if (friendshipStatus === 'pending_received') {
                  acceptRequest();
                } else {
                  sendRequest();
                }
              }}
              disabled={isFollowLoading}
              size="sm"
              className={`px-4 text-xs font-medium text-white ${
                friendshipStatus === 'friends'
                  ? 'bg-green-500 hover:bg-green-600' 
                  : friendshipStatus === 'pending_sent'
                  ? 'bg-yellow-500 hover:bg-yellow-600'
                  : 'bg-red-500 hover:bg-red-600'
              }`}
            >
              {friendshipStatus === 'friends' 
                ? 'Abonné'
                : friendshipStatus === 'pending_sent' 
                ? 'En attente'
                : friendshipStatus === 'pending_received' 
                ? 'Suivre'
                : 'Suivre'
              }
            </Button>
          )}
        </div>

        {/* Menu d'options pour l'auteur */}
        {isAuthor && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                <MoreHorizontal size={20} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-gray-800 border-gray-700">
              <DropdownMenuItem onClick={handleEdit} className="text-white hover:bg-gray-700">
                <Edit size={16} className="mr-2" />
                Modifier
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDelete} className="text-red-400 hover:bg-gray-700">
                <Trash2 size={16} className="mr-2" />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Contenu du post */}
      <div className="text-white mb-3">
        <p className="whitespace-pre-wrap">{post.content}</p>
      </div>

      {/* Options de recrutement */}
      {isRecruitmentPost && (
        post.required_profiles || 
        post.required_documents || 
        post.geographic_zones || 
        post.age_range || 
        (post.gender && post.gender !== 'all')
      ) && (
        <div className="mb-4 p-4 bg-gray-800 rounded-lg border border-gray-700 space-y-3">
          <h3 className="text-white font-semibold text-sm mb-2 flex items-center">
            <Briefcase size={16} className="mr-2" />
            Détails du recrutement
          </h3>
          
          {post.required_profiles && post.required_profiles.length > 0 && (
            <div>
              <h4 className="text-gray-300 text-xs font-medium mb-1">Profils recherchés</h4>
              <div className="flex flex-wrap gap-2">
                {post.required_profiles.map((profile: string, index: number) => (
                  <span key={index} className="bg-blue-600 text-white px-2 py-1 rounded text-xs">
                    {profile}
                  </span>
                ))}
              </div>
            </div>
          )}

          {post.required_documents && post.required_documents.length > 0 && (
            <div>
              <h4 className="text-gray-300 text-xs font-medium mb-1">Documents à fournir</h4>
              <ul className="space-y-1">
                {post.required_documents.map((doc: {name: string; required: boolean}, index: number) => (
                  <li key={index} className="text-gray-400 text-xs flex items-center">
                    <span className={`w-2 h-2 rounded-full mr-2 ${doc.required ? 'bg-red-500' : 'bg-gray-500'}`}></span>
                    {doc.name} {doc.required && <span className="ml-1 text-red-400">(obligatoire)</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {post.geographic_zones && post.geographic_zones.length > 0 && (
            <div>
              <h4 className="text-gray-300 text-xs font-medium mb-1">Zones géographiques</h4>
              <div className="flex flex-wrap gap-2">
                {post.geographic_zones.map((zone: string, index: number) => (
                  <span key={index} className="bg-gray-700 text-gray-300 px-2 py-1 rounded text-xs">
                    {zone}
                  </span>
                ))}
              </div>
            </div>
          )}

          {(post.age_range?.min || post.age_range?.max) && (
            <div>
              <h4 className="text-gray-300 text-xs font-medium mb-1">Âge requis</h4>
              <p className="text-gray-400 text-xs">
                {post.age_range.min && post.age_range.max 
                  ? `Entre ${post.age_range.min} et ${post.age_range.max} ans`
                  : post.age_range.min 
                  ? `Minimum ${post.age_range.min} ans`
                  : `Maximum ${post.age_range.max} ans`
                }
              </p>
            </div>
          )}

          {post.gender && post.gender !== 'all' && (
            <div>
              <h4 className="text-gray-300 text-xs font-medium mb-1">Sexe</h4>
              <p className="text-gray-400 text-xs">
                {post.gender === 'male' ? 'Homme' : 'Femme'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Médias */}
      {renderMedia()}

      {/* Compteurs des actions */}
      <div className="flex items-center space-x-6 mt-4 pt-3 border-t border-gray-800 text-sm text-gray-400">
        <div 
          className="flex items-center cursor-pointer hover:text-red-400 transition-colors"
          onClick={() => setLikesModalOpen(true)}
        >
          <Heart size={16} className={`mr-1.5 ${isLiked ? 'text-red-500 fill-current' : ''}`} />
          <span>{likesCount}</span>
        </div>
        
        <div className="flex items-center">
          <MessageCircle size={16} className="mr-1.5" />
          <span>{commentsCount}</span>
        </div>
        
        <div className="flex items-center">
          <Share size={16} className="mr-1.5" />
          <span>0</span>
        </div>
      </div>

      {/* Boutons d'action */}
      <div className="flex items-center space-x-2 mt-3">
        <Button 
          variant="ghost" 
          size="sm" 
          className={`flex-1 ${isLiked ? 'text-red-500' : 'text-gray-400'} hover:text-red-400`}
          onClick={() => toggleLike()}
          disabled={isLikeLoading || !user}
        >
          <Heart size={18} className={`mr-2 ${isLiked ? 'fill-current' : ''}`} />
          J'aime
        </Button>
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="flex-1 text-gray-400 hover:text-blue-400"
          onClick={handleComment}
        >
          <MessageCircle size={18} className="mr-2" />
          Commenter
        </Button>
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="flex-1 text-gray-400 hover:text-green-400"
          onClick={handleShare}
        >
          <Share size={18} className="mr-2" />
          Partager
        </Button>
      </div>

      {/* Bouton Postuler pour les posts de recrutement */}
      {isRecruitmentPost && !isAuthor && user && (
        <div className="mt-3">
          {existingApplication ? (
            <Button
              disabled
              className="w-full"
              variant="outline"
            >
              <Check className="mr-2 h-4 w-4" />
              {existingApplication.status === 'approved' 
                ? 'Candidature acceptée'
                : existingApplication.status === 'rejected'
                ? 'Candidature rejetée'
                : 'Candidature envoyée'}
            </Button>
          ) : (
            <Button
              onClick={() => setApplicationModalOpen(true)}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <Briefcase className="mr-2 h-4 w-4" />
              Postuler
            </Button>
          )}
        </div>
      )}

      {/* Section des commentaires intégrée */}
      <div ref={commentsRef}>
        <PostComments 
          postId={post.id} 
          commentsCount={commentsCount}
          openTrigger={openCommentsTick}
        />
      </div>

      {/* Modal de prévisualisation d'images */}
      <PostImageModal
        images={allImages}
        isOpen={imageViewerOpen}
        onClose={() => setImageViewerOpen(false)}
        initialIndex={selectedImageIndex}
      />

      {/* Modal des likes */}
      <PostLikesModal
        postId={post.id}
        isOpen={likesModalOpen}
        onClose={() => setLikesModalOpen(false)}
      />

      {/* Modal de candidature */}
      {user && (
        <ApplicationModal
          isOpen={applicationModalOpen}
          onClose={() => setApplicationModalOpen(false)}
          userId={user.id}
          recruiterId={post.author_id}
          sourceId={post.id}
          sourceType="post"
          postContent={post.content}
        />
      )}
    </div>
  );
};

export default PostCard;
