/**
 * Application de paramètres de l'école
 */
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserSchool, School } from '@/school/hooks/useSchool';
import { GeneralSettings } from './components/GeneralSettings';
import { SchoolYearsSettings } from './components/SchoolYearsSettings';
import { CustomizationSettings } from './components/CustomizationSettings';
import { Settings, Calendar, Palette } from 'lucide-react';

export const SettingsApp: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const schoolIdFromUrl = searchParams.get('id');
  const [activeTab, setActiveTab] = useState('general');

  // Récupérer l'école depuis l'URL ou l'école de l'utilisateur
  const { data: userSchool } = useUserSchool(user?.id);
  const { data: schoolFromUrl } = useQuery({
    queryKey: ['school', schoolIdFromUrl],
    queryFn: async () => {
      if (!schoolIdFromUrl) return null;
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .eq('id', schoolIdFromUrl)
        .single();
      if (error) throw error;
      return data as School;
    },
    enabled: !!schoolIdFromUrl,
  });

  const school = schoolIdFromUrl ? schoolFromUrl : userSchool;

  if (!school) {
    return (
      <div className="p-6 h-full flex items-center justify-center">
        <p className="text-muted-foreground">Chargement des paramètres...</p>
      </div>
    );
  }

  return (
    <div className="p-6 h-full overflow-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Paramètres</h2>
        <p className="text-muted-foreground mt-1">
          Configurez votre établissement et vos préférences
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Général</span>
          </TabsTrigger>
          <TabsTrigger value="years" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Années</span>
          </TabsTrigger>
          <TabsTrigger value="customization" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Apparence</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <GeneralSettings school={school} />
        </TabsContent>

        <TabsContent value="years" className="space-y-4">
          <SchoolYearsSettings schoolId={school.id} />
        </TabsContent>

        <TabsContent value="customization" className="space-y-4">
          <CustomizationSettings school={school} />
        </TabsContent>
      </Tabs>
    </div>
  );
};