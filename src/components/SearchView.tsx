import React, { useState } from 'react';
import { Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useSearch } from '@/search/hooks/useSearch';
import SearchResultsVideos from '@/search/components/SearchResultsVideos';
import SearchResultsPosts from '@/search/components/SearchResultsPosts';
import SearchResultsUsers from '@/search/components/SearchResultsUsers';

const SearchView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'videos' | 'posts' | 'users'>('all');
  
  const { data: results, isLoading } = useSearch(searchQuery, activeFilter);

  const filters = [
    { key: 'all' as const, label: 'Tout' },
    { key: 'videos' as const, label: 'Vidéos' },
    { key: 'posts' as const, label: 'Posts' },
    { key: 'users' as const, label: 'Utilisateurs' },
  ];

  return (
    <div className="h-full bg-black text-white pt-20 px-4">
      {/* Barre de recherche */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <Input
          type="text"
          placeholder="Rechercher des vidéos, posts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-white"
        />
      </div>

      {/* Filtres */}
      <div className="flex space-x-3 mb-6">
        {filters.map((filter) => (
          <Button
            key={filter.key}
            variant={activeFilter === filter.key ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveFilter(filter.key)}
            className={
              activeFilter === filter.key
                ? "bg-white text-black"
                : "border-gray-600 text-gray-300 hover:bg-gray-800"
            }
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {/* Résultats de recherche */}
      <div className="flex-1 pb-20">
        {searchQuery ? (
          isLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-400">Recherche en cours...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Résultats Tout */}
              {activeFilter === 'all' && results && (
                <>
                  {results.users.length > 0 && (
                    <div>
                      <h3 className="text-white font-semibold mb-3">Utilisateurs</h3>
                      <SearchResultsUsers users={results.users.slice(0, 3)} />
                    </div>
                  )}
                  {results.videos.length > 0 && (
                    <div>
                      <h3 className="text-white font-semibold mb-3">Vidéos</h3>
                      <SearchResultsVideos videos={results.videos.slice(0, 4)} />
                    </div>
                  )}
                  {results.posts.length > 0 && (
                    <div>
                      <h3 className="text-white font-semibold mb-3">Posts</h3>
                      <SearchResultsPosts posts={results.posts.slice(0, 3)} />
                    </div>
                  )}
                  {results.users.length === 0 && results.videos.length === 0 && results.posts.length === 0 && (
                    <div className="text-center py-12">
                      <p className="text-gray-400">Aucun résultat trouvé</p>
                    </div>
                  )}
                </>
              )}
              
              {/* Résultats Vidéos */}
              {activeFilter === 'videos' && results && (
                <SearchResultsVideos videos={results.videos} />
              )}
              
              {/* Résultats Posts */}
              {activeFilter === 'posts' && results && (
                <SearchResultsPosts posts={results.posts} />
              )}
              
              {/* Résultats Utilisateurs */}
              {activeFilter === 'users' && results && (
                <SearchResultsUsers users={results.users} />
              )}
            </div>
          )
        ) : (
          <div className="text-center py-12">
            <Search className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">
              Recherchez des vidéos, posts et utilisateurs
            </p>
            <p className="text-gray-500 text-sm mt-2">
              Découvrez du contenu selon vos centres d'intérêt
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchView;