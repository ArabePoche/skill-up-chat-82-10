/**
 * Application de gestion des évaluations
 * Permet de créer et gérer différents types d'évaluations : devoirs, interrogations, compositions, examens, etc.
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, ClipboardList, BookOpen } from 'lucide-react';
import { useSchoolYear } from '@/school/context/SchoolYearContext';
import { useHasPermission } from '@/school-os/hooks/useSchoolUserRole';
import { EvaluationModal } from './components/EvaluationModal';
import { EvaluationsList } from './components/EvaluationsList';
import { CompositionsTab } from './compositions/CompositionsTab';

export const EvaluationsApp: React.FC = () => {
  const { t } = useTranslation();
  const { school, activeSchoolYear } = useSchoolYear();
  const { hasPermission: canCreate } = useHasPermission(school?.id, 'evaluation.create');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('evaluations');

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
            <h1 className="text-2xl font-bold text-foreground">{t('schoolOS.evaluations.title')}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t('schoolOS.evaluations.title')}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-1 overflow-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="evaluations" className="gap-2">
              <ClipboardList className="h-4 w-4" />
              {t('schoolOS.apps.evaluations')}
            </TabsTrigger>
            <TabsTrigger value="compositions" className="gap-2">
              <BookOpen className="h-4 w-4" />
              {t('schoolOS.grades.composition')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="evaluations" className="mt-0">
            <div className="space-y-4">
              {canCreate && (
                <div className="flex justify-end">
                  <Button onClick={handleCreate} className="gap-2">
                    <Plus className="h-4 w-4" />
                    {t('schoolOS.evaluations.addEvaluation')}
                  </Button>
                </div>
              )}
              <EvaluationsList onEdit={handleEdit} />
            </div>
          </TabsContent>

          <TabsContent value="compositions" className="mt-0">
            <CompositionsTab />
          </TabsContent>
        </Tabs>
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
