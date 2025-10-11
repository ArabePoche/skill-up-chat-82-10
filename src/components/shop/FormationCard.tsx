
import React, { useCallback } from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';

interface Formation {
  id: string;
  title: string;
  description?: string;
  image_url?: string;
  thumbnail_url?: string;
  price: number;
  rating: number;
  students_count: number;
  profiles?: {
    first_name?: string;
    last_name?: string;
    username?: string;
  };
}

interface FormationCardProps {
  formation: Formation;
  onViewDetails: (formationId: string) => void;
  user: any;
}

const FormationCard: React.FC<FormationCardProps> = ({
  formation,
  onViewDetails,
  user
}) => {
  const formatAuthorName = useCallback((profile: any) => {
    if (!profile) return 'Auteur inconnu';
    const firstName = profile.first_name || '';
    const lastName = profile.last_name || '';
    return `${firstName} ${lastName}`.trim() || profile.username || 'Auteur inconnu';
  }, []);

  const handleViewDetailsClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('FormationCard: handleViewDetailsClick called for formation:', formation.id);
    onViewDetails(formation.id);
  }, [formation.id, onViewDetails]);

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-200 bg-white">
      <CardHeader className="p-0">
        <div className="relative">
          <div className="w-full h-48 bg-gradient-to-br from-edu-primary/10 to-edu-secondary/10 flex items-center justify-center">
            {formation.image_url || formation.thumbnail_url ? (
              <img 
                src={formation.image_url || formation.thumbnail_url} 
                alt={formation.title || 'Formation'}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-gray-400">Image formation</span>
            )}
          </div>
          <div className="absolute top-2 right-2 bg-edu-primary text-white px-2 py-1 rounded text-xs">
            Formation
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        <h3 className="font-semibold text-lg mb-2 line-clamp-2">{formation.title || 'Titre non disponible'}</h3>
        <p className="text-sm text-gray-600 mb-2">
          Par {formatAuthorName(formation.profiles)}
        </p>
        {formation.description && (
          <p className="text-sm text-gray-700 mb-3 line-clamp-2">{formation.description}</p>
        )}
        
        <div className="flex items-center space-x-1 mb-3">
          <div className="flex items-center">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                size={14}
                className={`${
                  i < Math.floor(formation.rating || 0)
                    ? 'text-yellow-400 fill-current'
                    : 'text-gray-300'
                }`}
              />
            ))}
          </div>
          <span className="text-sm font-medium">{formation.rating || 0}</span>
          <span className="text-sm text-gray-500">({formation.students_count || 0})</span>
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <Button 
          className="w-full bg-edu-primary hover:bg-edu-primary/90"
          onClick={handleViewDetailsClick}
        >
          Voir détails
        </Button>
      </CardFooter>
    </Card>
  );
};

export default FormationCard;
