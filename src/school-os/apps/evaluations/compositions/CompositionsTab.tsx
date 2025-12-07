/**
 * Onglet Compositions & Examens
 * Gestion des évaluations officielles utilisées pour les bulletins
 */
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useSchoolYear } from '@/school/context/SchoolYearContext';
import { useHasPermission } from '@/school-os/hooks/useSchoolUserRole';
import { CompositionsList } from './components/CompositionsList';
import { CompositionModal } from './components/CompositionModal';
import type { CompositionWithRelations } from './types';

export const CompositionsTab: React.FC = () => {
  const { school } = useSchoolYear();
  const { hasPermission: canCreate } = useHasPermission(school?.id, 'evaluation.create');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedComposition, setSelectedComposition] = useState<CompositionWithRelations | null>(null);

  const handleCreate = () => {
    setSelectedComposition(null);
    setIsModalOpen(true);
  };

  const handleEdit = (composition: CompositionWithRelations) => {
    setSelectedComposition(composition);
    setIsModalOpen(true);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setSelectedComposition(null);
  };

  return (
    <div className="space-y-6">
      {/* Header avec bouton création */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Compositions & Examens
          </h2>
          <p className="text-sm text-muted-foreground">
            Évaluations officielles pour la génération des bulletins scolaires
          </p>
        </div>

        {canCreate && (
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Nouvelle composition
          </Button>
        )}
      </div>

      {/* Liste des compositions */}
      <CompositionsList onEdit={handleEdit} />

      {/* Modal de création/édition */}
      {isModalOpen && (
        <CompositionModal
          composition={selectedComposition}
          onClose={handleClose}
        />
      )}
    </div>
  );
};
