/**
 * Hooks pour la gestion des bulletins scolaires
 * Tables: school_bulletin_settings, school_bulletin_mentions, 
 * school_bulletin_appreciation_templates, school_bulletin_templates, school_report_card_history
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

// Types
export interface BulletinSettings {
  id: string;
  school_id: string;
  school_year_id: string;
  grading_scale: number;
  passing_grade: number;
  show_class_average: boolean;
  show_rank: boolean;
  show_appreciation: boolean;
  show_conduct: boolean;
  show_absences: boolean;
  header_text: string | null;
  footer_text: string | null;
  signature_title: string;
  created_at: string;
  updated_at: string;
}

export interface BulletinMention {
  id: string;
  school_id: string;
  name: string;
  min_average: number;
  max_average: number;
  color: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface BulletinAppreciationTemplate {
  id: string;
  school_id: string;
  category: 'excellent' | 'good' | 'average' | 'below_average' | 'poor';
  text: string;
  min_average: number | null;
  max_average: number | null;
  created_at: string;
}

export interface BulletinTemplate {
  id: string;
  school_id: string;
  name: string;
  layout_type: 'classic' | 'modern' | 'compact';
  logo_position: 'left' | 'center' | 'right';
  show_photo: boolean;
  primary_color: string;
  secondary_color: string;
  font_family: string;
  is_default: boolean;
  config: Json;
  created_at: string;
  updated_at: string;
}

export interface ReportCardHistory {
  id: string;
  school_id: string;
  school_year_id: string;
  grading_period_id: string;
  class_id: string;
  student_id: string;
  template_id: string | null;
  general_average: number | null;
  rank: number | null;
  mention: string | null;
  conduct_grade: string | null;
  teacher_appreciation: string | null;
  principal_appreciation: string | null;
  absences_count: number;
  late_count: number;
  pdf_url: string | null;
  generated_by: string | null;
  generated_at: string;
  created_at: string;
  updated_at: string;
}

// ============ SETTINGS ============

export const useBulletinSettings = (schoolId?: string, schoolYearId?: string) => {
  return useQuery({
    queryKey: ['bulletin-settings', schoolId, schoolYearId],
    queryFn: async () => {
      if (!schoolId || !schoolYearId) return null;
      
      const { data, error } = await supabase
        .from('school_bulletin_settings')
        .select('*')
        .eq('school_id', schoolId)
        .eq('school_year_id', schoolYearId)
        .maybeSingle();
      
      if (error) throw error;
      return data as BulletinSettings | null;
    },
    enabled: !!schoolId && !!schoolYearId,
  });
};

export const useSaveBulletinSettings = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Partial<BulletinSettings> & { school_id: string; school_year_id: string }) => {
      const { data: existing } = await supabase
        .from('school_bulletin_settings')
        .select('id')
        .eq('school_id', data.school_id)
        .eq('school_year_id', data.school_year_id)
        .maybeSingle();

      if (existing) {
        const { data: updated, error } = await supabase
          .from('school_bulletin_settings')
          .update(data)
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        return updated;
      } else {
        const { data: created, error } = await supabase
          .from('school_bulletin_settings')
          .insert(data)
          .select()
          .single();
        if (error) throw error;
        return created;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bulletin-settings', variables.school_id, variables.school_year_id] });
      toast.success('Paramètres enregistrés');
    },
    onError: (error) => {
      console.error('Error saving settings:', error);
      toast.error('Erreur lors de l\'enregistrement');
    },
  });
};

// ============ MENTIONS ============

export const useBulletinMentions = (schoolId?: string) => {
  return useQuery({
    queryKey: ['bulletin-mentions', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      
      const { data, error } = await supabase
        .from('school_bulletin_mentions')
        .select('*')
        .eq('school_id', schoolId)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as BulletinMention[];
    },
    enabled: !!schoolId,
  });
};

export const useSaveBulletinMention = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { 
      id?: string;
      school_id: string; 
      name: string;
      min_average: number;
      max_average: number;
      color?: string;
      display_order?: number;
    }) => {
      if (data.id) {
        const { id, ...updateData } = data;
        const { data: updated, error } = await supabase
          .from('school_bulletin_mentions')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return updated;
      } else {
        const { data: created, error } = await supabase
          .from('school_bulletin_mentions')
          .insert({
            school_id: data.school_id,
            name: data.name,
            min_average: data.min_average,
            max_average: data.max_average,
            color: data.color,
            display_order: data.display_order,
          })
          .select()
          .single();
        if (error) throw error;
        return created;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bulletin-mentions', variables.school_id] });
      toast.success('Mention enregistrée');
    },
    onError: (error) => {
      console.error('Error saving mention:', error);
      toast.error('Erreur lors de l\'enregistrement');
    },
  });
};

export const useDeleteBulletinMention = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, schoolId }: { id: string; schoolId: string }) => {
      const { error } = await supabase
        .from('school_bulletin_mentions')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return { id, schoolId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bulletin-mentions', data.schoolId] });
      toast.success('Mention supprimée');
    },
    onError: (error) => {
      console.error('Error deleting mention:', error);
      toast.error('Erreur lors de la suppression');
    },
  });
};

// ============ APPRECIATION TEMPLATES ============

export const useBulletinAppreciations = (schoolId?: string) => {
  return useQuery({
    queryKey: ['bulletin-appreciations', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      
      const { data, error } = await supabase
        .from('school_bulletin_appreciation_templates')
        .select('*')
        .eq('school_id', schoolId)
        .order('category', { ascending: true });
      
      if (error) throw error;
      return data as BulletinAppreciationTemplate[];
    },
    enabled: !!schoolId,
  });
};

export const useSaveBulletinAppreciation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { 
      id?: string;
      school_id: string; 
      category: string; 
      text: string;
      min_average?: number;
      max_average?: number;
    }) => {
      if (data.id) {
        const { id, ...updateData } = data;
        const { data: updated, error } = await supabase
          .from('school_bulletin_appreciation_templates')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return updated;
      } else {
        const { data: created, error } = await supabase
          .from('school_bulletin_appreciation_templates')
          .insert({
            school_id: data.school_id,
            category: data.category,
            text: data.text,
            min_average: data.min_average,
            max_average: data.max_average,
          })
          .select()
          .single();
        if (error) throw error;
        return created;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bulletin-appreciations', variables.school_id] });
      toast.success('Appréciation enregistrée');
    },
    onError: (error) => {
      console.error('Error saving appreciation:', error);
      toast.error('Erreur lors de l\'enregistrement');
    },
  });
};

export const useDeleteBulletinAppreciation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, schoolId }: { id: string; schoolId: string }) => {
      const { error } = await supabase
        .from('school_bulletin_appreciation_templates')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return { id, schoolId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bulletin-appreciations', data.schoolId] });
      toast.success('Appréciation supprimée');
    },
    onError: (error) => {
      console.error('Error deleting appreciation:', error);
      toast.error('Erreur lors de la suppression');
    },
  });
};

// ============ TEMPLATES ============

export const useBulletinTemplates = (schoolId?: string) => {
  return useQuery({
    queryKey: ['bulletin-templates', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      
      const { data, error } = await supabase
        .from('school_bulletin_templates')
        .select('*')
        .eq('school_id', schoolId)
        .order('is_default', { ascending: false });
      
      if (error) throw error;
      return data as BulletinTemplate[];
    },
    enabled: !!schoolId,
  });
};

export const useSaveBulletinTemplate = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { 
      id?: string;
      school_id: string; 
      name: string;
      layout_type?: string;
      logo_position?: string;
      show_photo?: boolean;
      primary_color?: string;
      secondary_color?: string;
      font_family?: string;
      is_default?: boolean;
      config?: Json;
    }) => {
      if (data.id) {
        const { id, ...updateData } = data;
        const { data: updated, error } = await supabase
          .from('school_bulletin_templates')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return updated;
      } else {
        const { data: created, error } = await supabase
          .from('school_bulletin_templates')
          .insert({
            school_id: data.school_id,
            name: data.name,
            layout_type: data.layout_type,
            logo_position: data.logo_position,
            show_photo: data.show_photo,
            primary_color: data.primary_color,
            secondary_color: data.secondary_color,
            font_family: data.font_family,
            is_default: data.is_default,
            config: data.config,
          })
          .select()
          .single();
        if (error) throw error;
        return created;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bulletin-templates', variables.school_id] });
      toast.success('Template enregistré');
    },
    onError: (error) => {
      console.error('Error saving template:', error);
      toast.error('Erreur lors de l\'enregistrement');
    },
  });
};

export const useSetDefaultTemplate = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, schoolId }: { id: string; schoolId: string }) => {
      // D'abord, retirer le défaut de tous les templates
      await supabase
        .from('school_bulletin_templates')
        .update({ is_default: false })
        .eq('school_id', schoolId);
      
      // Puis définir le nouveau défaut
      const { data, error } = await supabase
        .from('school_bulletin_templates')
        .update({ is_default: true })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return { data, schoolId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['bulletin-templates', result.schoolId] });
      toast.success('Template par défaut mis à jour');
    },
    onError: (error) => {
      console.error('Error setting default template:', error);
      toast.error('Erreur lors de la mise à jour');
    },
  });
};

export const useDeleteBulletinTemplate = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, schoolId }: { id: string; schoolId: string }) => {
      const { error } = await supabase
        .from('school_bulletin_templates')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return { id, schoolId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bulletin-templates', data.schoolId] });
      toast.success('Template supprimé');
    },
    onError: (error) => {
      console.error('Error deleting template:', error);
      toast.error('Erreur lors de la suppression');
    },
  });
};

// ============ REPORT CARD HISTORY ============

export interface ReportCardHistoryWithRelations extends ReportCardHistory {
  class?: { id: string; name: string } | null;
  student?: { id: string; first_name: string; last_name: string } | null;
  period?: { id: string; name: string } | null;
  template?: { id: string; name: string } | null;
  generator?: { id: string; first_name: string; last_name: string } | null;
}

export const useReportCardHistory = (schoolId?: string, schoolYearId?: string, filters?: {
  classId?: string;
  periodId?: string;
}) => {
  return useQuery({
    queryKey: ['report-card-history', schoolId, schoolYearId, filters],
    queryFn: async () => {
      if (!schoolId || !schoolYearId) return [];
      
      let query = supabase
        .from('school_report_card_history')
        .select(`
          *,
          class:classes(id, name),
          student:students_school(id, first_name, last_name),
          period:grading_periods(id, name),
          template:school_bulletin_templates(id, name),
          generator:profiles(id, first_name, last_name)
        `)
        .eq('school_id', schoolId)
        .eq('school_year_id', schoolYearId)
        .order('generated_at', { ascending: false });
      
      if (filters?.classId) {
        query = query.eq('class_id', filters.classId);
      }
      if (filters?.periodId) {
        query = query.eq('grading_period_id', filters.periodId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as ReportCardHistoryWithRelations[];
    },
    enabled: !!schoolId && !!schoolYearId,
  });
};

export const useSaveReportCard = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { 
      school_id: string; 
      school_year_id: string;
      grading_period_id: string;
      class_id: string;
      student_id: string;
      template_id?: string;
      general_average?: number;
      rank?: number;
      mention?: string;
      conduct_grade?: string;
      teacher_appreciation?: string;
      principal_appreciation?: string;
      absences_count?: number;
      late_count?: number;
      pdf_url?: string;
      generated_by?: string;
    }) => {
      const { data: created, error } = await supabase
        .from('school_report_card_history')
        .upsert(data, { 
          onConflict: 'school_year_id,grading_period_id,student_id'
        })
        .select()
        .single();
      
      if (error) throw error;
      return created;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['report-card-history', variables.school_id, variables.school_year_id] });
      toast.success('Bulletin enregistré');
    },
    onError: (error) => {
      console.error('Error saving report card:', error);
      toast.error('Erreur lors de l\'enregistrement');
    },
  });
};
