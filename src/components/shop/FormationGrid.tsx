
import React, { useCallback } from 'react';
import FormationCard from './FormationCard';

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

interface FormationGridProps {
  formations: Formation[];
  onViewDetails: (formationId: string) => void;
  user: any;
}

const FormationGrid: React.FC<FormationGridProps> = ({
  formations,
  onViewDetails,
  user
}) => {
  const handleViewDetails = useCallback((formationId: string) => {
    console.log('FormationGrid: handleViewDetails called for formation:', formationId);
    onViewDetails(formationId);
  }, [onViewDetails]);

  if (formations.length === 0) {
    return (
      <div className="text-center py-8 sm:py-12">
        <p className="text-gray-500 text-sm sm:text-base">Aucune formation trouvée</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-4 px-2 sm:px-0">
      {formations.map((formation) => (
        <FormationCard
          key={formation.id}
          formation={formation}
          onViewDetails={handleViewDetails}
          user={user}
        />
      ))}
    </div>
  );
};

export default FormationGrid;
