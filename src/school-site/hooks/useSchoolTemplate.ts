/**
 * Hook pour résoudre et charger le template d'une école.
 * Utilise le template_key de la table school_site_templates via le site_template_id de l'école.
 * Retombe sur 'default' si aucun template n'est lié.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { loadTemplate } from '../registry';
import type { TemplateDefinition } from '../types';

export function useSchoolTemplate(siteTemplateId: string | null | undefined) {
  return useQuery<TemplateDefinition>({
    queryKey: ['school-template', siteTemplateId ?? 'default'],
    queryFn: async () => {
      let templateKey = 'default';

      if (siteTemplateId) {
        const { data } = await supabase
          .from('school_site_templates')
          .select('template_key')
          .eq('id', siteTemplateId)
          .maybeSingle();

        if (data?.template_key) {
          templateKey = data.template_key;
        }
      }

      return loadTemplate(templateKey);
    },
    staleTime: 1000 * 60 * 30, // 30min — les templates changent rarement
  });
}
