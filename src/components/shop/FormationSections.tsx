
import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import FormationGrid from './FormationGrid';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Users, Clock, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Formation {
  id: string;
  title: string;
  description?: string;
  image_url?: string;
  thumbnail_url?: string;
  price: number;
  rating: number;
  students_count: number;
  is_active: boolean;
  profiles?: {
    first_name?: string;
    last_name?: string;
    username?: string;
  };
}

interface FormationSectionsProps {
  formations: Formation[];
  onViewDetails: (formationId: string) => void;
  userInterests?: string[];
}

const FormationSections: React.FC<FormationSectionsProps> = ({
  formations,
  onViewDetails,
  userInterests = []
}) => {
  const { user } = useAuth();

  // Filtrer les formations par statut
  const activeFormations = formations.filter(f => f.is_active);
  const inConstructionFormations = formations.filter(f => !f.is_active);
  
  // Formations recommandées basées sur les centres d'intérêt
  const recommendedFormations = activeFormations.filter(formation => {
    // Logique simple de recommandation basée sur le titre/description
    if (userInterests.length === 0) return false;
    
    const formationText = `${formation.title} ${formation.description || ''}`.toLowerCase();
    return userInterests.some(interest => 
      formationText.includes(interest.toLowerCase())
    );
  }).slice(0, 6); // Limiter à 6 recommandations

  const handlePreInscription = (formationId: string) => {
    // TODO: Implémenter la logique de pré-inscription avec sondage
    console.log('Pre-inscription for formation:', formationId);
  };

  return (
    <div className="space-y-8">
      {/* Section Recommandées */}
      {recommendedFormations.length > 0 && (
        <section>
          <div className="flex items-center space-x-2 mb-6">
            <Star className="text-yellow-500" size={24} />
            <h2 className="text-2xl font-bold text-gray-900">Recommandées pour vous</h2>
            <Badge variant="secondary">Basé sur vos intérêts</Badge>
          </div>
          <FormationGrid
            formations={recommendedFormations}
            onViewDetails={onViewDetails}
            user={user}
          />
        </section>
      )}

      {/* Section Formations Disponibles */}
      <section>
        <div className="flex items-center space-x-2 mb-6">
          <Users className="text-green-500" size={24} />
          <h2 className="text-2xl font-bold text-gray-900">Formations Disponibles</h2>
          <Badge variant="outline">{activeFormations.length} formations</Badge>
        </div>
        
        {activeFormations.length > 0 ? (
          <FormationGrid
            formations={activeFormations}
            onViewDetails={onViewDetails}
            user={user}
          />
        ) : (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500">Aucune formation disponible pour le moment.</p>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Section Formations en Construction */}
      {inConstructionFormations.length > 0 && (
        <section>
          <div className="flex items-center space-x-2 mb-6">
            <Clock className="text-orange-500" size={24} />
            <h2 className="text-2xl font-bold text-gray-900">Formations en Construction</h2>
            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
              Bientôt disponibles
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {inConstructionFormations.map((formation) => (
              <Card key={formation.id} className="overflow-hidden opacity-90">
                <CardHeader className="p-0 relative">
                  <div className="w-full h-48 bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center relative">
                    {formation.image_url || formation.thumbnail_url ? (
                      <div className="relative w-full h-full">
                        <img 
                          src={formation.image_url || formation.thumbnail_url} 
                          alt={formation.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/20" />
                      </div>
                    ) : (
                      <Clock size={48} className="text-orange-400" />
                    )}
                    <div className="absolute top-2 right-2 bg-orange-500 text-white px-2 py-1 rounded text-xs font-bold">
                      EN CONSTRUCTION
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-4">
                  <CardTitle className="text-lg mb-2 line-clamp-2">
                    {formation.title}
                  </CardTitle>
                  <p className="text-sm text-gray-600 mb-2">
                    Par {formation.profiles?.first_name || formation.profiles?.username || 'Instructeur'}
                  </p>
                  {formation.description && (
                    <p className="text-sm text-gray-700 mb-4 line-clamp-2">
                      {formation.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-lg font-bold text-edu-primary">
                      {formation.price}€
                    </span>
                    <div className="flex items-center text-orange-600">
                      <AlertCircle size={16} className="mr-1" />
                      <span className="text-xs">Bientôt</span>
                    </div>
                  </div>

                  <Button 
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                    onClick={() => handlePreInscription(formation.id)}
                  >
                    Pré-inscription
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default FormationSections;
