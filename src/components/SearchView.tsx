import React, { useState } from 'react';
import { Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const SearchView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'videos' | 'posts'>('all');

  const filters = [
    { key: 'all' as const, label: 'Tout' },
    { key: 'videos' as const, label: 'Vidéos' },
    { key: 'posts' as const, label: 'Posts' },
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
      <div className="flex-1">
        {searchQuery ? (
          <div className="text-center py-12">
            <p className="text-gray-400">
              Recherche pour "{searchQuery}" en cours...
            </p>
            {/* TODO: Implémenter la recherche réelle */}
          </div>
        ) : (
          <div className="text-center py-12">
            <Search className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">
              Recherchez des vidéos et posts
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