/**
 * Application de gestion des évaluations
 * Permet de créer et gérer différents types d'évaluations : devoirs, interrogations, compositions, examens, etc.
 */
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useSchoolYear } from '@/school/context/SchoolYearContext';
import { useHasPermission } from '@/school-os/hooks/useSchoolUserRole';
import { EvaluationModal } from './components/EvaluationModal';
import { EvaluationsList } from './components/EvaluationsList';

export const EvaluationsApp: React.FC = () => {
  const { school, activeSchoolYear } = useSchoolYear();
  const { hasPermission: canCreate } = useHasPermission(school?.id, 'evaluation.create');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] = useState<string | null>(null);

  const handleCreate = () => {
    setSelectedEvaluation(null);
    setIsModalOpen(true);
  };

  const handleEdit = (evaluationId: string) => {
    setSelectedEvaluation(evaluationId);
    setIsModalOpen(true);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Évaluations</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gestion des devoirs, interrogations, compositions et examens
            </p>
          </div>
          {canCreate && (
            <Button onClick={handleCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              Nouvelle évaluation
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <EvaluationsList onEdit={handleEdit} />
      </div>

      {/* Modal */}
      {isModalOpen && (
        <EvaluationModal
          evaluationId={selectedEvaluation}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
};
