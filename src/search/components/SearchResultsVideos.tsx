/**
 * Affichage des résultats de recherche pour les vidéos
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Play } from 'lucide-react';

interface SearchResultsVideosProps {
  videos: any[];
}

const SearchResultsVideos: React.FC<SearchResultsVideosProps> = ({ videos }) => {
  const navigate = useNavigate();

  if (videos.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">Aucune vidéo trouvée</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {videos.map((video) => (
        <div
          key={video.id}
          onClick={() => navigate(`/video/${video.id}`)}
          className="relative aspect-[9/16] bg-gray-800 rounded-lg overflow-hidden cursor-pointer group"
        >
          <img
            src={video.thumbnail_url || '/placeholder.svg'}
            alt={video.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors flex items-center justify-center">
            <Play className="w-12 h-12 text-white" fill="white" />
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80">
            <p className="text-white text-sm font-medium line-clamp-2">
              {video.title}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SearchResultsVideos;
