/**
 * Affichage des résultats de recherche pour les utilisateurs
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { User } from 'lucide-react';
import VerifiedBadge from '@/components/VerifiedBadge';

interface SearchResultsUsersProps {
  users: any[];
}

const SearchResultsUsers: React.FC<SearchResultsUsersProps> = ({ users }) => {
  const navigate = useNavigate();

  if (users.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">Aucun utilisateur trouvé</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {users.map((user) => (
        <div
          key={user.id}
          onClick={() => navigate(`/profile/${user.id}`)}
          className="flex items-center space-x-3 p-3 bg-gray-800 rounded-lg hover:bg-gray-700 cursor-pointer transition-colors"
        >
          <Avatar className="w-12 h-12">
            <AvatarImage src={user.avatar_url} />
            <AvatarFallback className="bg-gray-600">
              <User className="w-6 h-6 text-gray-300" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium truncate inline-flex items-center gap-1">
              {user.first_name || user.last_name
                ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                : user.username || 'Utilisateur'}
              {user.is_verified && <VerifiedBadge size={14} showTooltip={false} />}
            </p>
            {user.username && (
              <p className="text-gray-400 text-sm truncate">@{user.username}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default SearchResultsUsers;
