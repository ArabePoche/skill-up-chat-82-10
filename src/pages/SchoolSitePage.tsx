/**
 * Page publique d'une école — utilise le système de templates modulaire.
 * Résout le template via site_template_id et délègue le rendu au SchoolSiteRenderer.
 */
import React, { useCallback, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Building2, ArrowLeft, Pencil, LayoutTemplate, X, Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import SchoolJoinRequestModal from '@/school/components/SchoolJoinRequestModal';
import { ParentCodeConfirmation } from '@/school-os/families/components/ParentCodeConfirmation';
import { School, useUpdateSchool } from '@/school/hooks/useSchool';
import { useAuth } from '@/hooks/useAuth';
import { useUserSchools } from '@/school/hooks/useUserSchools';
import { SchoolSiteTemplatesModal } from '@/school/components/SchoolSiteTemplatesModal';
import { useSchoolTemplate } from '@/school-site/hooks/useSchoolTemplate';
import SchoolSiteRenderer from '@/school-site/SchoolSiteRenderer';
import type { SchoolSiteData } from '@/school-site/types';

type SiteDraft = {
  site_cycles_programs: string;
  galleryText: string;
  address: string;
  city: string;
  country: string;
  site_facebook_url: string;
  site_instagram_url: string;
  site_twitter_url: string;
  site_linkedin_url: string;
  site_youtube_url: string;
};

const emptyDraft = (): SiteDraft => ({
  site_cycles_programs: '',
  galleryText: '',
  address: '',
  city: '',
  country: '',
  site_facebook_url: '',
  site_instagram_url: '',
  site_twitter_url: '',
  site_linkedin_url: '',
  site_youtube_url: '',
});

const draftFromSchool = (s: School): SiteDraft => ({
  site_cycles_programs: s.site_cycles_programs ?? '',
  galleryText: (s.site_gallery_urls ?? []).filter(Boolean).join('\n'),
  address: s.address ?? '',
  city: s.city ?? '',
  country: s.country ?? '',
  site_facebook_url: s.site_facebook_url ?? '',
  site_instagram_url: s.site_instagram_url ?? '',
  site_twitter_url: s.site_twitter_url ?? '',
  site_linkedin_url: s.site_linkedin_url ?? '',
  site_youtube_url: s.site_youtube_url ?? '',
});

const SchoolSitePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const schoolId = searchParams.get('id');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState<SiteDraft>(emptyDraft);

  const updateSchool = useUpdateSchool();

  const { data: userSchools } = useUserSchools(user?.id);
  const PERSONNEL_ROLES = ['owner', 'admin', 'teacher', 'secretary', 'staff', 'supervisor'];
  const isPersonnel = !!userSchools?.find(
    (s) => s.id === schoolId && PERSONNEL_ROLES.includes(s.role)
  );

  const { data: school, isLoading } = useQuery({
    queryKey: ['school-site', schoolId],
    queryFn: async () => {
      if (!schoolId) return null;
      const { data, error } = await supabase.from('schools').select('*, school_site_templates(*)').eq('id', schoolId).single();
      if (error) return null;
      return data as School & { school_site_templates?: any };
    },
    enabled: !!schoolId,
  });

  const isOwner =
    (!!user?.id && !!school?.owner_id && user.id === school.owner_id) ||
    !!userSchools?.find((s) => s.id === schoolId && s.role === 'owner');

  const { data: stats } = useQuery({
    queryKey: ['school-stats', schoolId],
    queryFn: async () => {
      if (!schoolId) return null;
      const [studentsResult, teachersResult, classesResult] = await Promise.all([
        supabase.from('students_school').select('id', { count: 'exact', head: true }).eq('school_id', schoolId),
        supabase.from('school_teachers').select('id', { count: 'exact', head: true }).eq('school_id', schoolId),
        supabase.from('classes').select('id', { count: 'exact', head: true }).eq('school_id', schoolId),
      ]);
      return {
        students: studentsResult.error ? 0 : (studentsResult.count ?? 0),
        teachers: teachersResult.error ? 0 : (teachersResult.count ?? 0),
        classes: classesResult.error ? 0 : (classesResult.count ?? 0),
      };
    },
    enabled: !!schoolId,
  });

  // Charger le template dynamiquement
  const { data: template, isLoading: templateLoading } = useSchoolTemplate(school?.site_template_id);

  const enterEditMode = useCallback(() => {
    if (!school) return;
    setDraft(draftFromSchool(school));
    setEditMode(true);
  }, [school]);

  const cancelEdit = useCallback(() => {
    setEditMode(false);
    setDraft(emptyDraft());
  }, []);

  const saveEdit = useCallback(async () => {
    if (!school) return;
    const urls = draft.galleryText.split('\n').map((s) => s.trim()).filter(Boolean);
    try {
      await updateSchool.mutateAsync({
        id: school.id,
        site_cycles_programs: draft.site_cycles_programs.trim() || null,
        site_gallery_urls: urls,
        address: draft.address.trim() || null,
        city: draft.city.trim() || null,
        country: draft.country.trim() || null,
        site_facebook_url: draft.site_facebook_url.trim() || null,
        site_instagram_url: draft.site_instagram_url.trim() || null,
        site_twitter_url: draft.site_twitter_url.trim() || null,
        site_linkedin_url: draft.site_linkedin_url.trim() || null,
        site_youtube_url: draft.site_youtube_url.trim() || null,
      });
      setEditMode(false);
    } catch {
      /* toast géré par le hook */
    }
  }, [school, draft, updateSchool]);

  const handleShareSite = useCallback(async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (!url) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: school?.name ?? 'École',
          text: t('school.shareSiteText', { defaultValue: 'Découvrez le site de cette école' }),
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success(t('school.linkCopied', { defaultValue: 'Lien du site copié dans le presse-papiers' }));
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      try {
        await navigator.clipboard.writeText(url);
        toast.success(t('school.linkCopied', { defaultValue: 'Lien du site copié dans le presse-papiers' }));
      } catch {
        toast.error(t('school.shareFailed', { defaultValue: 'Impossible de partager pour le moment' }));
      }
    }
  }, [school?.name, t]);

  const handleDraftChange = useCallback((field: string, value: any) => {
    setDraft((d) => ({ ...d, [field]: value }));
  }, []);

  if (!schoolId) {
    navigate(-1);
    return null;
  }

  if (isLoading || templateLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!school) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-6">
        <Building2 className="h-16 w-16 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground">
          {t('school.notFound', { defaultValue: 'École introuvable' })}
        </p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('common.back', { defaultValue: 'Retour' })}
        </Button>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const templateConfig = school.school_site_templates?.theme_config || {};

  const siteData: SchoolSiteData = {
    school,
    stats: stats ?? null,
    isOwner,
    isPersonnel,
    editMode,
    templateConfig,
  };

  // Toolbar partagée
  const toolbar = (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border-0"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        {t('common.back', { defaultValue: 'Retour' })}
      </Button>
      {isOwner && !editMode && (
        <Button
          size="sm"
          variant="secondary"
          className="bg-white/90 text-foreground hover:bg-white"
          onClick={enterEditMode}
        >
          <Pencil className="h-4 w-4 mr-2" />
          {t('school.editSiteMode', { defaultValue: 'Mode édition du site' })}
        </Button>
      )}
      {isOwner && editMode && (
        <>
          <Button
            size="sm"
            variant="secondary"
            className="bg-indigo-600 text-white hover:bg-indigo-700 border-0"
            onClick={() => setShowTemplatesModal(true)}
          >
            <LayoutTemplate className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">{t('school.chooseTemplate', { defaultValue: 'Choisir un modèle' })}</span>
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="bg-emerald-600 text-white hover:bg-emerald-700 border-0"
            onClick={saveEdit}
            disabled={updateSchool.isPending}
          >
            <Check className="h-4 w-4 mr-2" />
            {t('common.save', { defaultValue: 'Enregistrer' })}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="bg-white/20 text-white border-white/40 hover:bg-white/30"
            onClick={cancelEdit}
            disabled={updateSchool.isPending}
          >
            <X className="h-4 w-4 mr-2" />
            {t('common.cancel', { defaultValue: 'Annuler' })}
          </Button>
        </>
      )}
    </>
  );

  return (
    <>
      <SchoolSiteRenderer
        template={template}
        data={siteData}
        toolbar={toolbar}
        draft={draft as unknown as Record<string, any>}
        onDraftChange={handleDraftChange}
        onJoin={() => setShowJoinModal(true)}
        onShare={handleShareSite}
      />

      {user && <ParentCodeConfirmation />}

      <SchoolJoinRequestModal isOpen={showJoinModal} onClose={() => setShowJoinModal(false)} school={school} />
      <SchoolSiteTemplatesModal open={showTemplatesModal} onOpenChange={setShowTemplatesModal} school={school} />
    </>
  );
};

export default SchoolSitePage;
