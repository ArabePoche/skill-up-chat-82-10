/**
 * Template Pro — Layout premium avec bannière immersive, grille de features,
 * navigation par ancres et sections visuellement riches.
 */
import React from 'react';
import { Building2, MapPin, UserPlus, School as SchoolIcon, ChevronDown, Sparkles } from 'lucide-react';
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

/** Navigation par ancres pour le template Pro */
const ProNav: React.FC<{ primaryColor: string }> = ({ primaryColor }) => {
  const links = [
    { href: '#about', label: 'À propos' },
    { href: '#programs', label: 'Programmes' },
    { href: '#gallery', label: 'Galerie' },
    { href: '#contact', label: 'Contact' },
  ];

  return (
    <nav className="sticky top-0 z-20 backdrop-blur-xl bg-background/80 border-b border-border">
      <div className="max-w-5xl mx-auto px-4 flex items-center gap-1 overflow-x-auto py-2">
        {links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="px-4 py-2 text-sm font-medium rounded-full transition-colors whitespace-nowrap hover:bg-primary/10"
            style={{ color: primaryColor }}
          >
            {link.label}
          </a>
        ))}
      </div>
    </nav>
  );
};

/** Layout Pro : hero immersif pleine page + nav sticky + sections cards premium */
const ProLayout: React.FC<TemplateLayoutProps> = ({ data, children, toolbar, footer }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { school, templateConfig, isPersonnel, stats, editMode, isOwner } = data;

  const primaryColor = templateConfig.primary_color || school.primary_color || '#3b82f6';
  const secondaryColor = templateConfig.secondary_color || school.secondary_color || '#1e40af';
  const coverUrl = data.draft?.site_cover_url ?? school.site_cover_url;

  return (
    <div className="min-h-screen pb-24 bg-background">
      {/* Hero immersif pleine largeur */}
      <div
        className="relative w-full min-h-[420px] lg:min-h-[520px] flex flex-col justify-end overflow-hidden"
        style={{
          background: coverUrl
            ? undefined
            : `linear-gradient(145deg, ${primaryColor} 0%, ${secondaryColor} 40%, #0f172a 100%)`,
        }}
      >
        {/* Image de couverture */}
        {coverUrl && (
          <div className="absolute inset-0">
            <img src={coverUrl} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />
          </div>
        )}

        {/* Motifs décoratifs (si pas de cover) */}
        {!coverUrl && (
          <>
            <div className="absolute inset-0 opacity-[0.07]"
              style={{
                backgroundImage: `radial-gradient(circle at 25% 25%, white 2px, transparent 2px),
                                  radial-gradient(circle at 75% 75%, white 1px, transparent 1px)`,
                backgroundSize: '60px 60px, 40px 40px',
              }}
            />
            <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-20 blur-3xl"
              style={{ background: primaryColor }} />
            <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full opacity-15 blur-3xl"
              style={{ background: secondaryColor }} />
          </>
        )}

        {/* Toolbar */}
        <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-2">
          {toolbar}
        </div>

        {/* Badge premium + Upload couverture */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          {editMode && isOwner && (
            <CoverImageUpload
              currentUrl={coverUrl}
              onUpload={(url) => data.onDraftChange?.('site_cover_url', url)}
              onRemove={() => data.onDraftChange?.('site_cover_url', '')}
            />
          )}
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-400/20 text-amber-300 backdrop-blur-sm border border-amber-400/30">
            <Sparkles size={12} /> PRO
          </span>
        </div>

        {/* Contenu hero */}
        <div className="relative w-full max-w-5xl mx-auto px-4 sm:px-6 pb-12 pt-24">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <div className="flex flex-col lg:flex-row lg:items-end gap-6">
              {/* Logo */}
              <div className="w-28 h-28 lg:w-36 lg:h-36 rounded-3xl bg-white/10 backdrop-blur-md shadow-2xl flex items-center justify-center overflow-hidden shrink-0 border-2 border-white/20 ring-4 ring-white/5">
                {school.logo_url ? (
                  <img src={school.logo_url} alt={school.name} className="w-full h-full object-cover" />
                ) : (
                  <Building2 size={56} className="text-white/80" />
                )}
              </div>

              <div className="text-white flex-1">
                <h1 className="text-4xl lg:text-6xl font-extrabold tracking-tight drop-shadow-lg">
                  {school.name}
                </h1>
                <p className="mt-2 text-white/70 text-base lg:text-lg max-w-xl">
                  {school.description
                    ? school.description.substring(0, 120) + (school.description.length > 120 ? '…' : '')
                    : t('school.noDescription', { defaultValue: 'Découvrez notre établissement' })}
                </p>
                <div className="flex flex-wrap gap-2 mt-4">
                  <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-white/15 backdrop-blur-sm border border-white/20">
                    {getSchoolTypeLabel(school.school_type)}
                  </span>
                  {school.city && (
                    <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-white/15 backdrop-blur-sm border border-white/20 flex items-center gap-1.5">
                      <MapPin size={11} />{school.city}
                    </span>
                  )}
                  {school.country && (
                    <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-white/15 backdrop-blur-sm border border-white/20">
                      {school.country}
                    </span>
                  )}
                </div>

                {/* Stats inline dans le hero */}
                {stats && (stats.students > 0 || stats.teachers > 0 || stats.classes > 0) && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    className="flex gap-6 mt-6"
                  >
                    {stats.students > 0 && (
                      <div>
                        <div className="text-3xl font-extrabold text-white">{stats.students}</div>
                        <div className="text-xs text-white/50 uppercase tracking-wider">Élèves</div>
                      </div>
                    )}
                    {stats.teachers > 0 && (
                      <div>
                        <div className="text-3xl font-extrabold text-white">{stats.teachers}</div>
                        <div className="text-xs text-white/50 uppercase tracking-wider">Profs</div>
                      </div>
                    )}
                    {stats.classes > 0 && (
                      <div>
                        <div className="text-3xl font-extrabold text-white">{stats.classes}</div>
                        <div className="text-xs text-white/50 uppercase tracking-wider">Classes</div>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
            </div>

            {/* CTAs */}
            {user && (
              <div className="flex flex-wrap gap-3 mt-8">
                <Button
                  onClick={() => {}}
                  data-action="join"
                  className="gap-2 px-6 py-3 text-sm font-bold rounded-full shadow-lg"
                  style={{ backgroundColor: primaryColor }}
                >
                  <UserPlus size={16} />
                  {t('school.joinSchool', { defaultValue: 'Rejoindre cette école' })}
                </Button>
                {isPersonnel && (
                  <Button
                    onClick={() => navigate(`/school?id=${school.id}`)}
                    variant="outline"
                    className="gap-2 px-6 py-3 text-sm font-bold rounded-full border-white/30 text-white hover:bg-white/10"
                  >
                    <SchoolIcon size={16} />
                    {t('school.accessSchoolOS', { defaultValue: 'Accéder à School-OS' })}
                  </Button>
                )}
              </div>
            )}
          </motion.div>
        </div>

        {/* Flèche scroll */}
        <motion.div
          className="absolute bottom-4 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <ChevronDown className="text-white/40" size={24} />
        </motion.div>
      </div>

      {/* Navigation sticky */}
      <ProNav primaryColor={primaryColor} />

      {/* Contenu principal */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {children}
      </div>

      {/* Footer */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {footer}
      </div>
    </div>
  );
};

const sections: SectionDefinition[] = [
  { id: 'about', label: 'À propos', component: AboutSection },
  { id: 'cycles', label: 'Programmes', component: CyclesSection },
  { id: 'gallery', label: 'Galerie', optional: true, component: GallerySection },
  { id: 'location', label: 'Localisation', component: LocationSection },
  { id: 'contact', label: 'Contact', optional: true, component: ContactSection },
  { id: 'social-edit', label: 'Réseaux sociaux', optional: true, component: SocialEditSection },
];

const proTemplate: TemplateDefinition = {
  key: 'pro',
  name: 'Professionnel',
  Layout: ProLayout,
  sections,
};

export default proTemplate;
