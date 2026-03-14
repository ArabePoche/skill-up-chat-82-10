/**
 * Page de recherche de CV publics pour les propriétaires de boutique
 * Permet de chercher, filtrer et inviter des candidats
 */
import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileSearch, Users, Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CvSearchFiltersBar } from './components/CvSearchFiltersBar';
import { CvResultCard } from './components/CvResultCard';
import RecruitmentAdForm from './components/RecruitmentAdForm';
import { useSearchCvs, CvSearchFilters } from './hooks/useSearchCvs';
import { useAuth } from '@/hooks/useAuth';

const emptyFilters: CvSearchFilters = {
  query: '',
  location: '',
  experience: '',
  education: '',
};

interface CvSearchPageProps {
  shopId?: string;
}

const CvSearchPage: React.FC<CvSearchPageProps> = ({ shopId }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [filters, setFilters] = useState<CvSearchFilters>(emptyFilters);
  const [activeFilters, setActiveFilters] = useState<CvSearchFilters>(emptyFilters);
  const [hasSearched, setHasSearched] = useState(false);

  const { data: results, isLoading } = useSearchCvs(activeFilters, hasSearched);

  const handleSearch = useCallback(() => {
    setActiveFilters({ ...filters });
    setHasSearched(true);
  }, [filters]);

  const handleReset = useCallback(() => {
    setFilters(emptyFilters);
    setActiveFilters(emptyFilters);
    setHasSearched(false);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <FileSearch size={20} />
              Recherche de CV
            </h1>
            <p className="text-xs text-muted-foreground">
              Trouvez les profils qui correspondent à vos besoins
            </p>
          </div>
        </div>

        {/* Filtres */}
        <CvSearchFiltersBar
          filters={filters}
          onFiltersChange={setFilters}
          onSearch={handleSearch}
          onReset={handleReset}
        />

        {/* Résultats */}
        <div className="mt-6">
          {!hasSearched ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users size={48} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Utilisez les filtres ci-dessus pour rechercher des CV</p>
            </div>
          ) : isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">Recherche en cours...</p>
            </div>
          ) : results && results.length > 0 ? (
            <>
              <p className="text-sm text-muted-foreground mb-3">
                {results.length} CV trouvé{results.length > 1 ? 's' : ''}
              </p>
              <div className="space-y-3">
                {results.map((cv) => (
                  <CvResultCard
                    key={cv.id}
                    cv={cv}
                    currentUserId={user?.id}
                    shopId={shopId}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">Aucun CV ne correspond à vos critères</p>
              <p className="text-xs mt-1">Essayez d'élargir vos critères de recherche</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CvSearchPage;
