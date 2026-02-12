/**
 * Hook pour sauvegarder et charger les CVs depuis Supabase
 * Gère la persistance des données CV dans la table public_cvs
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CvData } from '../types';

export const useSaveCv = (userId: string | undefined) => {
  const [savedCvId, setSavedCvId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Charger le CV existant de l'utilisateur
  const loadExistingCv = useCallback(async () => {
    if (!userId) return null;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('public_cvs')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setSavedCvId(data.id);
        return {
          cvData: {
            personalInfo: data.personal_info as any,
            education: data.education as any,
            experiences: data.experiences as any,
            skills: data.skills as any,
            languages: data.languages as any,
            hobbies: data.hobbies as any,
            certifications: data.certifications as any,
            projects: data.projects as any,
            references: data.references as any,
            sectionOrder: data.section_order || [],
          } as CvData,
          isPublic: data.is_public,
        };
      }
      return null;
    } catch (error: any) {
      console.error('Erreur chargement CV:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Sauvegarder / mettre à jour le CV
  const saveCv = useCallback(async (cvData: CvData, isPublic: boolean = true) => {
    if (!userId) {
      toast({ title: "Erreur", description: "Vous devez être connecté pour sauvegarder votre CV", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        user_id: userId,
        title: cvData.personalInfo.fullName || 'Mon CV',
        personal_info: cvData.personalInfo as any,
        education: cvData.education as any,
        experiences: cvData.experiences as any,
        skills: cvData.skills as any,
        languages: cvData.languages as any,
        hobbies: cvData.hobbies as any,
        certifications: cvData.certifications as any,
        projects: cvData.projects as any,
        references: cvData.references as any,
        section_order: cvData.sectionOrder,
        is_public: isPublic,
      };

      if (savedCvId) {
        const { error } = await supabase
          .from('public_cvs')
          .update(payload)
          .eq('id', savedCvId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('public_cvs')
          .insert(payload)
          .select('id')
          .single();
        if (error) throw error;
        setSavedCvId(data.id);
      }

      toast({ title: "CV sauvegardé !", description: "Votre CV est maintenant consultable publiquement." });
    } catch (error: any) {
      console.error('Erreur sauvegarde CV:', error);
      toast({ title: "Erreur", description: error.message || "Impossible de sauvegarder le CV", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }, [userId, savedCvId, toast]);

  return { savedCvId, isSaving, isLoading, loadExistingCv, saveCv };
};
