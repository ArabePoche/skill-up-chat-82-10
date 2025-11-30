/**
 * Vue principale de gestion du personnel avec onglets
 */
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Shield } from 'lucide-react';
import { PersonnelList } from './PersonnelList';
import { RolesSettings } from '@/school-os/apps/settings/components/RolesSettings';

interface PersonnelViewProps {
  schoolId: string | undefined;
}

export const PersonnelView: React.FC<PersonnelViewProps> = ({ schoolId }) => {
  if (!schoolId) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <p className="text-muted-foreground text-center">
          Veuillez sélectionner une école
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <Tabs defaultValue="members" className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 sm:p-6 pb-0 shrink-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="members" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Membres</span>
            </TabsTrigger>
            <TabsTrigger value="roles" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">Rôles</span>
            </TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="members" className="flex-1 overflow-auto p-4 sm:p-6 pt-4 mt-0">
          <PersonnelList schoolId={schoolId} />
        </TabsContent>
        
        <TabsContent value="roles" className="flex-1 overflow-auto p-4 sm:p-6 pt-4 mt-0">
          <RolesSettings schoolId={schoolId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
