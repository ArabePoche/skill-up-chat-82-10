/**
 * Composant carousel horizontal affichant les séries de l'utilisateur
 */
import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Series {
  id: string;
  title: string;
  cover_url?: string;
}

interface SeriesCarouselProps {
  series: Series[];
  isOwner: boolean;
  onCreateSeries: () => void;
  onSelectSeries: (seriesId: string) => void;
}

const SeriesCarousel: React.FC<SeriesCarouselProps> = ({
  series,
  isOwner,
  onCreateSeries,
  onSelectSeries,
}) => {
  return (
    <div className="mb-6 px-4">
      <h3 className="text-lg font-semibold mb-3">Séries</h3>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {isOwner && (
          <Button
            onClick={onCreateSeries}
            variant="outline"
            className="flex-shrink-0 h-32 w-24 flex flex-col items-center justify-center gap-2 border-dashed"
          >
            <Plus size={24} />
            <span className="text-xs">Créer</span>
          </Button>
        )}
        
        {series.map((item) => (
          <div
            key={item.id}
            className="flex-shrink-0 w-24"
          >
            <div 
              onClick={() => onSelectSeries(item.id)}
              className="h-32 bg-muted rounded-lg overflow-hidden mb-2 cursor-pointer hover:opacity-90 transition-opacity"
            >
              {item.cover_url ? (
                <img
                  src={item.cover_url}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary">
                    {item.title.charAt(0)}
                  </span>
                </div>
              )}
            </div>
            <p className="text-xs font-medium line-clamp-2 text-center">
              {item.title}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SeriesCarousel;
