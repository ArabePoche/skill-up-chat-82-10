import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, LayoutTemplate, CheckCircle2 } from 'lucide-react';
import { School, useUpdateSchool } from '@/school/hooks/useSchool';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

interface Template {
  id: string;
  name: string;
  description: string;
  thumbnail_url: string;
  theme_config: any;
}

export function SchoolSiteTemplatesModal({ 
  open, 
  onOpenChange, 
  school 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  school: School;
}) {
  const { t } = useTranslation();
  const updateSchool = useUpdateSchool();

  const { data: templates, isLoading } = useQuery({
    queryKey: ['school-site-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('school_site_templates')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return data as Template[];
    },
    enabled: open
  });

  const handleSelectTemplate = async (templateId: string) => {
    try {
      await updateSchool.mutateAsync({
        id: school.id,
        site_template_id: templateId
      });
      toast.success(t('school.templateUpdated', { defaultValue: 'Le modèle a été appliqué avec succès.' }));
      onOpenChange(false);
    } catch (err: any) {
      toast.error(t('common.error', { defaultValue: 'Une erreur est survenue.' }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5 text-indigo-600" />
            {t('school.chooseTemplate', { defaultValue: 'Choisissez le modèle de votre site public' })}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Chargement des modèles...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
            {templates?.map((tpl) => {
              const isSelected = school.site_template_id === tpl.id;
              
              return (
                <div 
                  key={tpl.id} 
                  className={`group relative flex flex-col justify-between overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md ${
                    isSelected ? 'ring-2 ring-indigo-600 border-transparent' : 'border-border'
                  }`}
                >
                  <div className="p-6 pb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-lg">{tpl.name}</h3>
                      {isSelected && <CheckCircle2 className="h-5 w-5 text-indigo-600" />}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {tpl.description}
                    </p>
                  </div>
                  
                  <div className="p-6 pt-0 mt-auto">
                    <Button 
                      className={`w-full ${isSelected ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200' : ''}`}
                      variant={isSelected ? 'outline' : 'default'}
                      onClick={() => handleSelectTemplate(tpl.id)}
                      disabled={isSelected || updateSchool.isPending}
                    >
                      {isSelected 
                        ? t('school.templateActive', { defaultValue: 'Modèle actif' }) 
                        : t('school.applyTemplate', { defaultValue: 'Appliquer ce modèle' })}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}