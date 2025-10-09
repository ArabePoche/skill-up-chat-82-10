/**
 * Affichage des résultats de recherche pour les posts
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { User } from 'lucide-react';

interface SearchResultsPostsProps {
  posts: any[];
}

const SearchResultsPosts: React.FC<SearchResultsPostsProps> = ({ posts }) => {
  const navigate = useNavigate();

  if (posts.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">Aucun post trouvé</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <div
          key={post.id}
          onClick={() => navigate(`/post/${post.id}`)}
          className="p-4 bg-gray-800 rounded-lg hover:bg-gray-700 cursor-pointer transition-colors"
        >
          <div className="flex items-center space-x-2 mb-2">
            <Avatar className="w-8 h-8">
              <AvatarImage src={post.profiles?.avatar_url} />
              <AvatarFallback className="bg-gray-600">
                <User className="w-4 h-4 text-gray-300" />
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-white text-sm font-medium">
                {post.profiles?.first_name || post.profiles?.last_name
                  ? `${post.profiles.first_name || ''} ${post.profiles.last_name || ''}`.trim()
                  : post.profiles?.username || 'Utilisateur'}
              </p>
            </div>
          </div>
          <p className="text-gray-200 line-clamp-3">{post.content}</p>
        </div>
      ))}
    </div>
  );
};

export default SearchResultsPosts;
