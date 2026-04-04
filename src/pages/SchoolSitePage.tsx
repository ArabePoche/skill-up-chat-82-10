import React, { useCallback, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  Calendar,
  ArrowLeft,
  School as SchoolIcon,
  ExternalLink,
  Languages,
  UserPlus,
  Users,
  GraduationCap,
  BookOpen,
  BarChart2,
  Pencil,
  Share2,
  ImageIcon,
  Layers,
  LayoutTemplate,
  X,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import SchoolJoinRequestModal from '@/school/components/SchoolJoinRequestModal';
import { ParentCodeConfirmation } from '@/school-os/families/components/ParentCodeConfirmation';
import { School, useUpdateSchool } from '@/school/hooks/useSchool';
import { useAuth } from '@/hooks/useAuth';
import { useUserSchools } from '@/school/hooks/useUserSchools';
import { motion } from 'framer-motion';
import { SchoolSiteTemplatesModal } from '@/school/components/SchoolSiteTemplatesModal';

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

/**
 * Page publique d'une école + mode édition (propriétaire)
 */
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
        supabase
          .from('students_school')
          .select('id', { count: 'exact', head: true })
          .eq('school_id', schoolId),
        supabase
          .from('school_teachers')
          .select('id', { count: 'exact', head: true })
          .eq('school_id', schoolId),
        supabase
          .from('classes')
          .select('id', { count: 'exact', head: true })
          .eq('school_id', schoolId),
      ]);
      return {
        students: studentsResult.error ? 0 : (studentsResult.count ?? 0),
        teachers: teachersResult.error ? 0 : (teachersResult.count ?? 0),
        classes: classesResult.error ? 0 : (classesResult.count ?? 0),
      };
    },
    enabled: !!schoolId,
  });

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
    const urls = draft.galleryText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
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

  if (!schoolId) {
    navigate(-1);
    return null;
  }

  if (isLoading) {
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

  const templateConfig = school.school_site_templates?.theme_config || {};
  const primaryColor = templateConfig.primary_color || school.primary_color || '#3b82f6';
  const secondaryColor = templateConfig.secondary_color || school.secondary_color || '#1e40af';
  const fontFamily = templateConfig.font_family || 'sans-serif';
  const layoutStyle = templateConfig.layout || 'default'; // 'centered', 'card', 'default'

  const galleryUrls = (school.site_gallery_urls ?? []).filter(Boolean);
  const mapQuery = [school.address, school.city, school.country].filter(Boolean).join(', ');
  const mapsHref = mapQuery
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`
    : null;

  const getSchoolTypeLabel = (type: string) => {
    switch (type) {
      case 'virtual':
        return t('school.virtual', { defaultValue: 'École en ligne' });
      case 'physical':
        return t('school.physical', { defaultValue: 'École physique' });
      case 'both':
        return t('school.both', { defaultValue: 'Hybride' });
      default:
        return type;
    }
  };

  const socialItems = [
    { key: 'facebook', label: 'Facebook', url: school.site_facebook_url },
    { key: 'instagram', label: 'Instagram', url: school.site_instagram_url },
    { key: 'twitter', label: 'X / Twitter', url: school.site_twitter_url },
    { key: 'linkedin', label: 'LinkedIn', url: school.site_linkedin_url },
    { key: 'youtube', label: 'YouTube', url: school.site_youtube_url },
  ].filter((x) => x.url && x.url.trim());

  const cyclesText = editMode ? draft.site_cycles_programs : (school.site_cycles_programs ?? '');
  const showCyclesEmpty = !cyclesText.trim();
  const IconStyle = { color: primaryColor };

  const sectionClass = layoutStyle === 'minimal'
    ? 'bg-transparent py-6 border-b border-border/40 last:border-0'
    : layoutStyle === 'wide'
      ? 'bg-card rounded-3xl p-8 lg:p-10 shadow-lg shadow-black/5 dark:shadow-none border border-border/30'
      : 'bg-card rounded-xl p-5 shadow-sm border border-border';

  const containerClass = layoutStyle === 'minimal'
    ? 'mx-auto max-w-3xl px-4 py-8 space-y-10'
    : layoutStyle === 'wide'
      ? 'mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-8'
      : 'max-w-2xl mx-auto px-4 py-4 space-y-6';

  const headerClass = layoutStyle === 'minimal'
    ? 'relative p-8 text-center bg-muted/30 rounded-3xl mt-4 border border-border/50'
    : layoutStyle === 'wide'
      ? 'relative rounded-[2.5rem] overflow-hidden min-h-[360px] flex items-end shadow-xl'
      : 'relative rounded-xl overflow-hidden';

  return (
    <div className={`min-h-screen pb-24 ${layoutStyle === 'minimal' ? 'bg-white dark:bg-zinc-950' : 'bg-background'}`} style={{ fontFamily: `"${fontFamily}", sans-serif` }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className={containerClass}
      >
        {/* Header / Hero */}
        <div
          className={headerClass}
          style={layoutStyle === 'minimal' ? { background: '#f8fafc' } : { background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
        >
          <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-2">
            <Button
              variant="ghost"
              size="sm"
              className={layoutStyle === 'minimal' ? "bg-white/80 hover:bg-white text-gray-900 border-0 shadow-sm" : "bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border-0"}
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('common.back', { defaultValue: 'Retour' })}
            </Button>
            {isOwner && !editMode && (
              <Button
                size="sm"
                variant="secondary"
                className="bg-white/90 text-gray-900 hover:bg-white"
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
          </div>

          <div className={layoutStyle === 'minimal' ? "px-6 pt-16 pb-8 mx-auto text-center" : layoutStyle === 'wide' ? "px-6 pt-32 pb-8 text-white w-full" : "px-6 pt-20 pb-10 text-white"}>
            <div className={`flex ${layoutStyle === 'minimal' ? 'flex-col items-center justify-center' : 'items-center'} gap-6 mb-4`}>
              <div className={`w-28 h-28 rounded-full ${layoutStyle === 'minimal' ? 'bg-indigo-100 mx-auto border-4 border-white shadow-sm' : 'bg-white/20 backdrop-blur-sm border-2 border-white/40 shadow-xl'} flex items-center justify-center overflow-hidden shrink-0`}>
                {school.logo_url ? (
                  <img src={school.logo_url} alt={school.name} className="w-full h-full object-cover" />
                ) : (
                  <Building2 size={48} style={layoutStyle === 'minimal' ? {color: primaryColor} : {}} className={layoutStyle === 'minimal' ? '' : 'text-white'} />
                )}
              </div>
              <div className={layoutStyle === 'minimal' ? 'text-center' : 'text-left'}>
                <h1 className={`${layoutStyle === 'minimal' ? 'text-4xl mt-3 text-slate-800' : layoutStyle === 'wide' ? 'text-5xl drop-shadow-md pb-2' : 'text-2xl'} font-bold`}>{school.name}</h1>
                <div className={`flex flex-wrap gap-2 mt-3 ${layoutStyle === 'minimal' ? 'justify-center' : ''}`}>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${layoutStyle === 'minimal' ? 'bg-indigo-100 text-indigo-800' : 'bg-white/20 text-white shadow-sm backdrop-blur-md'}`}>
                    {getSchoolTypeLabel(school.school_type)}
                  </span>
                  {school.city && (
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${layoutStyle === 'minimal' ? 'bg-zinc-100 text-zinc-700' : 'bg-white/20 text-white shadow-sm backdrop-blur-md'}`}>
                      <MapPin size={10} />
                      {school.city}
                    </span>
                  )}
                  {school.country && (
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${layoutStyle === 'minimal' ? 'bg-zinc-100 text-zinc-700' : 'bg-white/20 text-white shadow-sm backdrop-blur-md'}`}>{school.country}</span>
                  )}
                </div>
              </div>
            </div>

            {user && (
              <div className={`flex flex-wrap gap-2 mt-6 ${layoutStyle === 'minimal' ? 'justify-center' : ''}`}>
                <Button
                  onClick={() => setShowJoinModal(true)}
                  className={`flex items-center gap-2 ${layoutStyle === 'minimal' ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm' : 'bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white'} border-0`}
                  variant="outline"
                >
                  <UserPlus size={18} />
                  {t('school.joinSchool', { defaultValue: 'Rejoindre cette école' })}
                </Button>
                {isPersonnel && (
                  <Button
                    onClick={() => navigate(`/school?id=${school.id}`)}
                    className={`flex items-center gap-2 ${layoutStyle === 'minimal' ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm' : 'bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white'} border-0`}
                    variant="outline"
                  >
                    <SchoolIcon size={18} />
                    {t('school.accessSchoolOS', { defaultValue: 'Accéder à School-OS' })}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {editMode && isOwner && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
            {t('school.editSiteHint', {
              defaultValue:
                'Vous modifiez le contenu affiché sur ce site public. Enregistrez pour publier les changements.',
            })}
          </div>
        )}

        {user && <ParentCodeConfirmation />}

        {/* À propos */}
        <section className={sectionClass}>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Building2 size={18} style={{ color: primaryColor }} />
            {t('school.about', { defaultValue: 'À propos' })}
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {school.description ||
              t('school.noDescription', { defaultValue: 'Aucune description disponible pour cette école.' })}
          </p>

          {(school.founded_year || school.teaching_language) && (
            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border">
              {school.founded_year && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar size={16} className="text-muted-foreground" />
                  <span>
                    {t('school.founded', { defaultValue: 'Fondée en' })} {school.founded_year}
                  </span>
                </div>
              )}
              {school.teaching_language && (
                <div className="flex items-center gap-2 text-sm">
                  <Languages size={16} className="text-muted-foreground" />
                  <span>{school.teaching_language}</span>
                </div>
              )}
            </div>
          )}
        </section>

        {stats && (stats.students > 0 || stats.teachers > 0 || stats.classes > 0) && (
          <section className={sectionClass}>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <BarChart2 size={18} style={{ color: primaryColor }} />
              {t('school.statistics', { defaultValue: 'Statistiques' })}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              {stats.students > 0 && (
                <div>
                  <div className="text-2xl font-bold" style={{ color: primaryColor }}>{stats.students}</div>
                  <div className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-1">
                    <Users size={12} />
                    {t('school.students', { defaultValue: 'Élèves' })}
                  </div>
                </div>
              )}
              {stats.teachers > 0 && (
                <div>
                  <div className="text-2xl font-bold" style={{ color: primaryColor }}>{stats.teachers}</div>
                  <div className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-1">
                    <GraduationCap size={12} />
                    {t('school.teachers', { defaultValue: 'Enseignants' })}
                  </div>
                </div>
              )}
              {stats.classes > 0 && (
                <div>
                  <div className="text-2xl font-bold" style={{ color: primaryColor }}>{stats.classes}</div>
                  <div className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-1">
                    <BookOpen size={12} />
                    {t('school.classes', { defaultValue: 'Classes' })}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Cycles et programmes — toujours visible */}
        <section className={sectionClass}>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Layers size={18} style={{ color: primaryColor }} />
            {t('school.cyclesAndPrograms', { defaultValue: 'Cycles et programmes' })}
          </h2>
          {editMode && isOwner ? (
            <div className="space-y-2">
              <Label htmlFor="cycles-programs">{t('school.cyclesAndProgramsEdit', { defaultValue: 'Texte présenté aux visiteurs' })}</Label>
              <Textarea
                id="cycles-programs"
                rows={8}
                value={draft.site_cycles_programs}
                onChange={(e) => setDraft((d) => ({ ...d, site_cycles_programs: e.target.value }))}
                placeholder={t('school.cyclesPlaceholder', {
                  defaultValue: 'Ex. : Maternelle, Primaire, Collège… Programmes, options, langues…',
                })}
                className="resize-y min-h-[120px]"
              />
            </div>
          ) : showCyclesEmpty ? (
            <p className="text-sm text-muted-foreground italic">
              {t('school.cyclesEmpty', {
                defaultValue: 'Aucune information sur les cycles et programmes pour le moment.',
              })}
            </p>
          ) : (
            <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {school.site_cycles_programs}
            </div>
          )}
        </section>

        {/* Galerie — toujours visible */}
        <section className={sectionClass}>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <ImageIcon size={18} style={{ color: primaryColor }} />
            {t('school.gallery', { defaultValue: 'Galerie' })}
          </h2>
          {editMode && isOwner ? (
            <div className="space-y-2">
              <Label htmlFor="gallery-urls">
                {t('school.galleryEdit', { defaultValue: 'Une URL d’image par ligne (https://…)' })}
              </Label>
              <Textarea
                id="gallery-urls"
                rows={5}
                value={draft.galleryText}
                onChange={(e) => setDraft((d) => ({ ...d, galleryText: e.target.value }))}
                placeholder="https://…"
                className="font-mono text-xs"
              />
            </div>
          ) : galleryUrls.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              {t('school.galleryEmpty', { defaultValue: 'Aucune photo dans la galerie pour le moment.' })}
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {galleryUrls.map((src, i) => (
                <a
                  key={`${src}-${i}`}
                  href={src}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="aspect-square rounded-lg overflow-hidden border border-border bg-muted"
                >
                  <img src={src} alt="" className="w-full h-full object-cover hover:opacity-90 transition-opacity" />
                </a>
              ))}
            </div>
          )}
        </section>

        {/* Localisation — toujours visible */}
        <section className={sectionClass}>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <MapPin size={18} style={{ color: primaryColor }} />
            {t('school.location', { defaultValue: 'Localisation' })}
          </h2>
          {editMode && isOwner ? (
            <div className="space-y-3">
              <div>
                <Label htmlFor="addr">{t('school.address', { defaultValue: 'Adresse' })}</Label>
                <Input
                  id="addr"
                  value={draft.address}
                  onChange={(e) => setDraft((d) => ({ ...d, address: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="city">{t('school.city', { defaultValue: 'Ville' })}</Label>
                  <Input
                    id="city"
                    value={draft.city}
                    onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="country">{t('school.country', { defaultValue: 'Pays' })}</Label>
                  <Input
                    id="country"
                    value={draft.country}
                    onChange={(e) => setDraft((d) => ({ ...d, country: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          ) : (
            <>
              {!school.address && !school.city && !school.country ? (
                <p className="text-sm text-muted-foreground italic">
                  {t('school.locationEmpty', { defaultValue: 'Adresse non renseignée.' })}
                </p>
              ) : (
                <div className="space-y-2 text-sm">
                  {school.address && (
                    <div className="flex items-start gap-2">
                      <MapPin size={16} className="text-muted-foreground mt-0.5 shrink-0" />
                      <span>{school.address}</span>
                    </div>
                  )}
                  {(school.city || school.country) && (
                    <div className="flex items-center gap-2">
                      <Building2 size={16} className="text-muted-foreground shrink-0" />
                      <span>{[school.city, school.country].filter(Boolean).join(', ')}</span>
                    </div>
                  )}
                </div>
              )}
              {mapsHref && (
                <Button variant="outline" size="sm" className="mt-4" asChild>
                  <a href={mapsHref} target="_blank" rel="noopener noreferrer">
                    <MapPin className="h-4 w-4 mr-2" />
                    {t('school.openInMaps', { defaultValue: 'Voir sur la carte' })}
                    <ExternalLink className="h-3 w-3 ml-2 opacity-70" />
                  </a>
                </Button>
              )}
            </>
          )}
        </section>

        {/* Réseaux — édition en mode édition */}
        {editMode && isOwner && (
          <section className={sectionClass}>
            <h2 className="text-lg font-semibold mb-4">{t('school.socialLinks', { defaultValue: 'Réseaux sociaux (footer)' })}</h2>
            <div className="grid gap-3">
              {(
                [
                  ['site_facebook_url', 'Facebook', draft.site_facebook_url] as const,
                  ['site_instagram_url', 'Instagram', draft.site_instagram_url] as const,
                  ['site_twitter_url', 'X / Twitter', draft.site_twitter_url] as const,
                  ['site_linkedin_url', 'LinkedIn', draft.site_linkedin_url] as const,
                  ['site_youtube_url', 'YouTube', draft.site_youtube_url] as const,
                ] as const
              ).map(([key, label, val]) => (
                <div key={key}>
                  <Label htmlFor={key}>{label}</Label>
                  <Input
                    id={key}
                    type="url"
                    value={val}
                    onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                    placeholder="https://"
                    className="mt-1"
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Contact */}
        {(school.phone || school.email || school.website) && (
          <section className={sectionClass}>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Phone size={18} style={{ color: primaryColor }} />
              {t('school.contact', { defaultValue: 'Contact' })}
            </h2>
            <div className="space-y-3">
              {school.phone && (
                <a
                  href={`tel:${school.phone}`}
                  className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                >
                  <Phone size={18} style={{ color: primaryColor }} />
                  <span className="text-sm">{school.phone}</span>
                </a>
              )}
              {school.email && (
                <a
                  href={`mailto:${school.email}`}
                  className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                >
                  <Mail size={18} style={{ color: primaryColor }} />
                  <span className="text-sm">{school.email}</span>
                </a>
              )}
              {school.website && (
                <a
                  href={school.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                >
                  <Globe size={18} style={{ color: primaryColor }} />
                  <span className="text-sm flex-1">{school.website}</span>
                  <ExternalLink size={14} className="text-muted-foreground" />
                </a>
              )}
            </div>
          </section>
        )}

        {/* Footer : partage + réseaux */}
        <footer className="rounded-xl border border-border bg-card/80 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <Button type="button" variant="default" className="w-full sm:w-auto gap-2" onClick={handleShareSite}>
              <Share2 className="h-4 w-4" />
              {t('school.shareSite', { defaultValue: 'Partager le site' })}
            </Button>
            {socialItems.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center sm:justify-end">
                {socialItems.map((s) => (
                  <Button key={s.key} variant="outline" size="sm" asChild>
                    <a href={s.url!.startsWith('http') ? s.url! : `https://${s.url}`} target="_blank" rel="noopener noreferrer">
                      {s.label}
                      <ExternalLink className="h-3 w-3 ml-1 opacity-70" />
                    </a>
                  </Button>
                ))}
              </div>
            )}
          </div>
          {!editMode && socialItems.length === 0 && (
            <p className="text-xs text-center text-muted-foreground">
              {t('school.footerNoSocial', { defaultValue: 'Les liens réseaux sociaux apparaîtront ici une fois renseignés (mode édition).' })}
            </p>
          )}
          <p className="text-xs text-center text-muted-foreground pt-2 border-t border-border">
            © {new Date().getFullYear()} {school.name} •{' '}
            {t('school.allRightsReserved', { defaultValue: 'Tous droits réservés' })}
          </p>
        </footer>
      </motion.div>

      <SchoolJoinRequestModal isOpen={showJoinModal} onClose={() => setShowJoinModal(false)} school={school} />
      <SchoolSiteTemplatesModal open={showTemplatesModal} onOpenChange={setShowTemplatesModal} school={school} />
    </div>
  );
};

export default SchoolSitePage;






