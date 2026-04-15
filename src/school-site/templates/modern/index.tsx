/**
 * Template Modern — Layout avec sidebar latérale sur desktop, hero plein écran.
 * Structure complètement différente du Default : 2 colonnes, sidebar fixe, hero immersif.
 */
import React from 'react';
import { Building2, MapPin, UserPlus, School as SchoolIcon, Phone, Mail, Globe, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';
import type { TemplateDefinition, TemplateLayoutProps, SectionDefinition } from '../../types';
import {
  AboutSection, StatsSection, CyclesSection,
  GallerySection, LocationSection, ContactSection, SocialEditSection,
  CoverImageUpload,
} from '../../components/SharedSections';

const getSchoolTypeLabel = (type: string) => {
  const map: Record<string, string> = {
    virtual: 'École en ligne', physical: 'École physique', both: 'Hybride',
  };
  return map[type] || type;
};

/** Sidebar compacte affichée sur desktop — infos clés de l'école */
const Sidebar: React.FC<{ data: TemplateLayoutProps['data'] }> = ({ data }) => {
  const { school, stats, templateConfig } = data;
  const primaryColor = templateConfig.primary_color || school.primary_color || '#3b82f6';

  return (
    <aside className="hidden lg:block w-80 shrink-0">
      <div className="sticky top-6 space-y-4">
        <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
          <div className="w-24 h-24 mx-auto rounded-2xl overflow-hidden border-2 shadow-md mb-4"
            style={{ borderColor: primaryColor }}>
            {school.logo_url ? (
              <img src={school.logo_url} alt={school.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <Building2 size={36} style={{ color: primaryColor }} />
              </div>
            )}
          </div>
          <h2 className="font-bold text-lg">{school.name}</h2>
          <span className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
            {getSchoolTypeLabel(school.school_type)}
          </span>
          {(school.city || school.country) && (
            <p className="text-sm text-muted-foreground mt-2 flex items-center justify-center gap-1">
              <MapPin size={12} /> {[school.city, school.country].filter(Boolean).join(', ')}
            </p>
          )}
        </div>

        {stats && (stats.students > 0 || stats.teachers > 0 || stats.classes > 0) && (
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="grid grid-cols-3 gap-2 text-center">
              {stats.students > 0 && (
                <div>
                  <div className="text-xl font-bold" style={{ color: primaryColor }}>{stats.students}</div>
                  <div className="text-[10px] text-muted-foreground">Élèves</div>
                </div>
              )}
              {stats.teachers > 0 && (
                <div>
                  <div className="text-xl font-bold" style={{ color: primaryColor }}>{stats.teachers}</div>
                  <div className="text-[10px] text-muted-foreground">Profs</div>
                </div>
              )}
              {stats.classes > 0 && (
                <div>
                  <div className="text-xl font-bold" style={{ color: primaryColor }}>{stats.classes}</div>
                  <div className="text-[10px] text-muted-foreground">Classes</div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-2">
          {school.phone && (
            <a href={`tel:${school.phone}`} className="flex items-center gap-2 text-sm hover:text-primary transition-colors">
              <Phone size={14} style={{ color: primaryColor }} /> {school.phone}
            </a>
          )}
          {school.email && (
            <a href={`mailto:${school.email}`} className="flex items-center gap-2 text-sm hover:text-primary transition-colors">
              <Mail size={14} style={{ color: primaryColor }} /> {school.email}
            </a>
          )}
          {school.website && (
            <a href={school.website} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm hover:text-primary transition-colors">
              <Globe size={14} style={{ color: primaryColor }} />
              <span className="truncate">{school.website}</span>
              <ExternalLink size={10} className="shrink-0" />
            </a>
          )}
        </div>
      </div>
    </aside>
  );
};

/** Layout Modern : hero plein largeur + 2 colonnes (contenu + sidebar) */
const ModernLayout: React.FC<TemplateLayoutProps> = ({ data, children, toolbar, footer }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { school, templateConfig, isPersonnel, editMode, isOwner } = data;

  const primaryColor = templateConfig.primary_color || school.primary_color || '#3b82f6';
  const secondaryColor = templateConfig.secondary_color || school.secondary_color || '#1e40af';
  const coverUrl = data.draft?.site_cover_url ?? school.site_cover_url;

  return (
    <div className="min-h-screen pb-24 bg-background">
      {/* Hero plein largeur */}
      <div className="relative w-full min-h-[280px] lg:min-h-[360px] flex items-end"
        style={{
          background: coverUrl
            ? undefined
            : `linear-gradient(160deg, ${primaryColor} 0%, ${secondaryColor} 50%, ${primaryColor}dd 100%)`,
        }}>
        {/* Image de couverture */}
        {coverUrl && (
          <div className="absolute inset-0">
            <img src={coverUrl} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40" />
          </div>
        )}

        {/* Motif décoratif (si pas de cover) */}
        {!coverUrl && (
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
        )}
        
        <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-2">
          {toolbar}
        </div>

        {/* Bouton upload couverture */}
        {editMode && isOwner && (
          <div className="absolute top-4 right-4 z-10">
            <CoverImageUpload
              currentUrl={coverUrl}
              onUpload={(url) => data.onDraftChange?.('site_cover_url', url)}
              onRemove={() => data.onDraftChange?.('site_cover_url', '')}
            />
          </div>
        )}

        <div className="relative w-full max-w-6xl mx-auto px-4 sm:px-6 pb-8 pt-20">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}>
            <div className="flex items-end gap-6">
              {school.logo_url && (
                <div className="w-24 h-24 lg:w-32 lg:h-32 rounded-2xl bg-white shadow-xl flex items-center justify-center overflow-hidden shrink-0 -mb-12 lg:-mb-16 border-4 border-white">
                  <img src={school.logo_url} alt={school.name} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="text-white pb-1">
                <h1 className="text-3xl lg:text-5xl font-bold drop-shadow-md">{school.name}</h1>
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-sm">
                    {getSchoolTypeLabel(school.school_type)}
                  </span>
                  {school.city && (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-sm flex items-center gap-1">
                      <MapPin size={10} />{school.city}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Actions sous le hero */}
      {user && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 lg:pt-20 pb-4 flex flex-wrap gap-2">
          <Button onClick={() => {}} variant="default" className="gap-2" data-action="join">
            <UserPlus size={16} /> {t('school.joinSchool', { defaultValue: 'Rejoindre cette école' })}
          </Button>
          {isPersonnel && (
            <Button onClick={() => navigate(`/school?id=${school.id}`)} variant="outline" className="gap-2">
              <SchoolIcon size={16} /> {t('school.accessSchoolOS', { defaultValue: 'Accéder à School-OS' })}
            </Button>
          )}
        </div>
      )}

      {/* Contenu 2 colonnes */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex gap-8">
        <div className="flex-1 min-w-0 space-y-6">
          {children}
        </div>
        <Sidebar data={data} />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {footer}
      </div>
    </div>
  );
};

const sections: SectionDefinition[] = [
  { id: 'about', label: 'À propos', component: AboutSection },
  { id: 'cycles', label: 'Cycles et programmes', component: CyclesSection },
  { id: 'gallery', label: 'Galerie', optional: true, component: GallerySection },
  { id: 'stats', label: 'Statistiques (mobile)', optional: true, component: StatsSection },
  { id: 'location', label: 'Localisation', component: LocationSection },
  { id: 'contact', label: 'Contact (mobile)', optional: true, component: ContactSection },
  { id: 'social-edit', label: 'Réseaux sociaux', optional: true, component: SocialEditSection },
];

const modernTemplate: TemplateDefinition = {
  key: 'modern',
  name: 'Moderne',
  Layout: ModernLayout,
  sections,
};

export default modernTemplate;
