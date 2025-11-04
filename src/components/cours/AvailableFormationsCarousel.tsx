/**
 * Carrousel des formations disponibles - invite l'utilisateur à s'inscrire
 */
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Clock, Users, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';

interface Formation {
  id: string;
  title: string;
  description: string;
  thumbnail_url?: string;
  duration_hours?: number;
  level?: string;
  price?: number;
  status?: string;
}

interface AvailableFormationsCarouselProps {
  formations: Formation[];
}

const AvailableFormationsCarousel: React.FC<AvailableFormationsCarouselProps> = ({ formations }) => {
  const navigate = useNavigate();

  const handleViewFormation = (formationId: string) => {
    navigate(`/shop?formation=${formationId}`);
  };

  if (!formations || formations.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-900">
          Vous n'êtes inscrit à aucune formation
        </h2>
        <p className="text-gray-600">
          Découvrez nos formations disponibles et commencez votre apprentissage dès aujourd'hui
        </p>
      </div>

      <Carousel
        opts={{
          align: 'start',
          loop: true,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-2 md:-ml-4">
          {formations.map((formation) => (
            <CarouselItem key={formation.id} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">
              <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full">
                <div className="relative h-48 bg-gradient-to-br from-primary/10 to-primary/5">
                  {formation.thumbnail_url ? (
                    <img
                      src={formation.thumbnail_url}
                      alt={formation.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <BookOpen className="h-16 w-16 text-primary/40" />
                    </div>
                  )}
                  {formation.status === 'in_construction' && (
                    <div className="absolute top-2 right-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded">
                      En construction
                    </div>
                  )}
                </div>

                <CardContent className="p-4 space-y-3">
                  <div>
                    <h3 className="font-semibold text-lg line-clamp-2 mb-2">
                      {formation.title}
                    </h3>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {formation.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    {formation.duration_hours && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{formation.duration_hours}h</span>
                      </div>
                    )}
                    {formation.level && (
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span className="capitalize">{formation.level}</span>
                      </div>
                    )}
                  </div>

                  {formation.price !== undefined && (
                    <div className="text-lg font-bold text-primary">
                      {formation.price === 0 ? 'Gratuit' : `${formation.price.toLocaleString()} FCFA`}
                    </div>
                  )}

                  <Button 
                    onClick={() => handleViewFormation(formation.id)}
                    className="w-full group"
                    variant="default"
                  >
                    Découvrir
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="hidden md:flex" />
        <CarouselNext className="hidden md:flex" />
      </Carousel>
    </div>
  );
};

export default AvailableFormationsCarousel;
