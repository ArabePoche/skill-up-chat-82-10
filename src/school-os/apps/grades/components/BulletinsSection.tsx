/**
 * Section Bulletins - Génération et gestion des bulletins scolaires
 */
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Settings, Layout, History } from 'lucide-react';
import { BulletinGenerationTab } from './bulletins/BulletinGenerationTab';
import { BulletinSettingsTab } from './bulletins/BulletinSettingsTab';
import { BulletinTemplatesTab } from './bulletins/BulletinTemplatesTab';
import { BulletinHistoryTab } from './bulletins/BulletinHistoryTab';

interface BulletinsSectionProps {
  availableClasses: Array<{
    id: string;
    name: string;
    cycle: string;
    current_students: number;
    max_students: number;
    subjects: Array<{ id: string; name: string }>;
  }>;
  schoolId: string;
  schoolYearId: string;
}

export const BulletinsSection: React.FC<BulletinsSectionProps> = ({ 
  availableClasses,
  schoolId,
  schoolYearId 
}) => {
  const [activeTab, setActiveTab] = useState('generation');

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="grid w-full grid-cols-4 mb-4">
        <TabsTrigger value="generation" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          <span className="hidden sm:inline">Génération</span>
        </TabsTrigger>
        <TabsTrigger value="settings" className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline">Paramètres</span>
        </TabsTrigger>
        <TabsTrigger value="templates" className="flex items-center gap-2">
          <Layout className="h-4 w-4" />
          <span className="hidden sm:inline">Templates</span>
        </TabsTrigger>
        <TabsTrigger value="history" className="flex items-center gap-2">
          <History className="h-4 w-4" />
          <span className="hidden sm:inline">Historique</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="generation" className="mt-0">
        <BulletinGenerationTab 
          availableClasses={availableClasses}
          schoolId={schoolId}
          schoolYearId={schoolYearId}
        />
      </TabsContent>

      <TabsContent value="settings" className="mt-0">
        <BulletinSettingsTab schoolId={schoolId} schoolYearId={schoolYearId} />
      </TabsContent>

      <TabsContent value="templates" className="mt-0">
        <BulletinTemplatesTab schoolId={schoolId} />
      </TabsContent>

      <TabsContent value="history" className="mt-0">
        <BulletinHistoryTab 
          schoolId={schoolId}
          schoolYearId={schoolYearId}
        />
      </TabsContent>
    </Tabs>
  );
};
