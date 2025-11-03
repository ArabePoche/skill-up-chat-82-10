
import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import FormationGrid from './FormationGrid';
import PreInscriptionModal from './PreInscriptionModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Users, Clock, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  const { user } = useAuth();
  const [selectedFormationForPreInscription, setSelectedFormationForPreInscription] = useState<Formation | null>(null);

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

  const handlePreInscription = (formation: Formation) => {
    setSelectedFormationForPreInscription(formation);
  };

  return (
    <div className="space-y-8">
      {/* Section Recommandées */}
      {recommendedFormations.length > 0 && (
        <section>
          <div className="flex items-center space-x-2 mb-6">
            <Star className="text-yellow-500" size={24} />
            <h2 className="text-2xl font-bold text-gray-900">{t('shop.recommendedForYou')}</h2>
            <Badge variant="secondary">{t('shop.basedOnInterests')}</Badge>
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
          <h2 className="text-2xl font-bold text-gray-900">{t('shop.availableFormations')}</h2>
          <Badge variant="outline">{activeFormations.length} {t('shop.formations')}</Badge>
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
              <p className="text-gray-500">{t('shop.noFormationsAvailable')}</p>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Section Formations en Construction */}
      {inConstructionFormations.length > 0 && (
        <section>
          <div className="flex items-center space-x-2 mb-6">
            <Clock className="text-orange-500" size={24} />
            <h2 className="text-2xl font-bold text-gray-900">{t('shop.inConstruction')}</h2>
            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
              {t('shop.comingSoon')}
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {inConstructionFormations.map((formation) => (
              <Card key={formation.id} className="overflow-hidden opacity-95 hover:opacity-100 transition-opacity">
                <CardHeader className="p-0 relative">
                  <div className="w-full h-48 bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center relative">
                    {formation.image_url || formation.thumbnail_url ? (
                      <div className="relative w-full h-full">
                        <img 
                          src={formation.image_url || formation.thumbnail_url} 
                          alt={formation.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-orange-500/20" />
                      </div>
                    ) : (
                      <Clock size={48} className="text-orange-400" />
                    )}
                    <div className="absolute top-2 right-2 bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                      {t('shop.inConstructionBadge')}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-4">
                  <CardTitle className="text-lg mb-2 line-clamp-2 text-gray-800">
                    {formation.title}
                  </CardTitle>
                  <p className="text-sm text-gray-600 mb-2">
                    {t('shop.by')} {formation.profiles?.first_name || formation.profiles?.username || t('shop.instructor')}
                  </p>
                  {formation.description && (
                    <p className="text-sm text-gray-700 mb-4 line-clamp-3">
                      {formation.description}
                    </p>
                  )}
                  
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                    <div className="flex items-center text-orange-700 mb-2">
                      <AlertCircle size={16} className="mr-2" />
                      <span className="text-sm font-medium">{t('shop.inDevelopment')}</span>
                    </div>
                    <p className="text-xs text-orange-600">
                      {t('shop.beFirstToDiscover')}
                    </p>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <span className="text-lg font-bold text-orange-600">
                      {formation.price?.toLocaleString('fr-FR')} FCFA
                    </span>
                    <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {t('shop.soon')}
                    </div>
                  </div>

                  <Button 
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium shadow-md"
                    onClick={() => handlePreInscription(formation)}
                  >
                    <Clock size={16} className="mr-2" />
                    {t('shop.freePreRegistration')}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Modal de pré-inscription */}
      {selectedFormationForPreInscription && (
        <PreInscriptionModal
          isOpen={!!selectedFormationForPreInscription}
          onClose={() => setSelectedFormationForPreInscription(null)}
          formation={selectedFormationForPreInscription}
        />
      )}
    </div>
  );
};

export default FormationSections;
