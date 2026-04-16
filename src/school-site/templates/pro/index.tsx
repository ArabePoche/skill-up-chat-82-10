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
  CoverImageUpload, ActivitiesSection, LogoImageUpload,
} from '../../components/SharedSections';

const getSchoolTypeLabel = (type: string) => {
  const map: Record<string, string> = {
    virtual: 'École en ligne', physical: 'École physique', both: 'Hybride',
  };
  return map[type] || type;
};

/** En-tête bien coloré pour le template Pro (Header fixe) */
const ProHeader: React.FC<{ 
  school: any, 
  primaryColor: string, 
  secondaryColor: string,
  editMode: boolean,
  isOwner: boolean,
  currentLogoUrl?: string | null,
  onDraftChange?: (field: string, value: any) => void
}> = ({ school, primaryColor, secondaryColor, editMode, isOwner, currentLogoUrl, onDraftChange }) => {
  const links = [
    { href: '#top', label: 'Accueil' },
    { href: '#join', label: 'Inscription' },
    { href: '#cycles', label: 'Pédagogie' },
    { href: '#activities', label: 'Actualités' },
    { href: '#annonces', label: 'Annonces' },
    { href: '#contact', label: 'Contact' },
  ];

  const displayLogo = currentLogoUrl || school.logo_url;

  return (
    <header 
      className="sticky top-0 z-50 shadow-xl border-b border-white/10"
      style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
    >
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* À gauche : Logo et nom */}
        <div className="flex items-center gap-3">
          <div className="relative">
            {displayLogo ? (
              <img src={displayLogo} alt={school.name} className="w-12 h-12 rounded-full border-2 border-white/20 bg-white object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full border-2 border-white/20 bg-white/20 flex items-center justify-center">
                <SchoolIcon className="w-5 h-5 text-white" />
              </div>
            )}
            
            {editMode && isOwner && (
              <LogoImageUpload
                currentUrl={displayLogo}
                onUpload={(url) => onDraftChange?.('logo_url', url)}
                onRemove={() => onDraftChange?.('logo_url', '')}
              />
            )}
          </div>
          <span className="text-white font-bold text-lg hidden sm:block truncate max-w-[200px] lg:max-w-md">
            {school.name}
          </span>
        </div>
        {/* À droite : Menus fixes */}
        <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="px-3 py-1.5 text-sm font-medium text-white/90 hover:text-white hover:bg-white/10 rounded-full transition-colors whitespace-nowrap"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
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
    <div id="top" className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <ProHeader 
        school={school} 
        primaryColor={primaryColor} 
        secondaryColor={secondaryColor}
        editMode={editMode}
        isOwner={isOwner}
        currentLogoUrl={data.draft?.logo_url ?? school.logo_url}
        onDraftChange={data.onDraftChange}
      />

      <main className="flex-1">
        {/* Hero immersif pleine largeur */}
        <div
          className="relative w-full min-h-[420px] lg:min-h-[520px] flex flex-col justify-end overflow-hidden shadow-2xl"
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
            <div className="flex flex-col lg:flex-row lg:items-end gap-6 text-center lg:text-left">
              <div className="text-white flex-1">
                <h1 className="text-4xl lg:text-6xl md:text-5xl font-extrabold tracking-tight drop-shadow-2xl">
                  {school.name}
                </h1>
                <p className="mt-4 text-white/90 text-lg lg:text-xl max-w-2xl drop-shadow-md mx-auto lg:mx-0">
                  {school.description
                    ? school.description.substring(0, 150) + (school.description.length > 150 ? '…' : '')
                    : t('school.noDescription', { defaultValue: 'Découvrez notre établissement' })}
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Flèche scroll */}
        <motion.div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 hidden md:block"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <ChevronDown className="text-white/60 drop-shadow-md" size={32} />
        </motion.div>
      </div>

      {/* Barre d'Informations et d'Actions (Statistiques, CTAs, etc. en bas du cover) */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 relative z-20 -mt-16 sm:-mt-20">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6"
        >
          {/* Informations et Statistiques */}
          <div className="flex-1 space-y-4">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
              <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {getSchoolTypeLabel(school.school_type)}
              </span>
              {school.city && (
                <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 flex items-center gap-1.5">
                  <MapPin size={14} />{school.city}
                </span>
              )}
              {school.country && (
                <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {school.country}
                </span>
              )}
            </div>

            {stats && (stats.students > 0 || stats.teachers > 0 || stats.classes > 0) && (
              <div className="flex flex-wrap justify-center md:justify-start gap-6 pt-2 border-t border-slate-100 dark:border-slate-800">
                {stats.students > 0 && (
                  <div className="text-center md:text-left">
                    <div className="text-2xl font-extrabold text-slate-900 dark:text-white" style={{ color: primaryColor }}>{stats.students}</div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Élèves</div>
                  </div>
                )}
                {stats.teachers > 0 && (
                  <div className="text-center md:text-left">
                    <div className="text-2xl font-extrabold text-slate-900 dark:text-white" style={{ color: primaryColor }}>{stats.teachers}</div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Profs</div>
                  </div>
                )}
                {stats.classes > 0 && (
                  <div className="text-center md:text-left">
                    <div className="text-2xl font-extrabold text-slate-900 dark:text-white" style={{ color: primaryColor }}>{stats.classes}</div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Classes</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Boutons d'Action (CTAs) */}
          {user && (
            <div className="flex flex-col sm:flex-row gap-3 md:border-l md:border-slate-100 dark:md:border-slate-800 md:pl-6 shrink-0">
              <Button
                onClick={() => {}}
                data-action="join"
                id="join"
                className="gap-2 px-6 py-6 sm:py-4 text-sm font-bold rounded-2xl shadow-lg transition hover:scale-105 text-white"
                style={{ backgroundColor: primaryColor }}
              >
                <UserPlus size={18} />
                {t('school.joinSchool', { defaultValue: 'Rejoindre cette école' })}
              </Button>
              {isPersonnel && (
                <Button
                  onClick={() => navigate(`/school?id=${school.id}`)}
                  variant="outline"
                  className="gap-2 px-6 py-6 sm:py-4 text-sm font-bold rounded-2xl border-slate-200 dark:border-slate-700 bg-white hover:bg-slate-50 text-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white"
                >
                  <SchoolIcon size={18} />
                  {t('school.accessSchoolOS', { defaultValue: 'Accéder à School-OS' })}
                </Button>
              )}
            </div>
          )}
        </motion.div>
      </div>

      {/* Contenu principal */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-12 relative z-10">
        <div className="bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl rounded-3xl p-6 sm:p-10 shadow-xl border border-white/20 dark:border-white/5 space-y-16">
          {children}
        </div>
      </div>
      </main>

      {/* Footer premium et bien coloré */}
      <footer 
        className="mt-8 text-white relative overflow-hidden"
        style={{
          background: `linear-gradient(to top right, ${secondaryColor}, #0f172a)`
        }}
      >
        <div className="absolute inset-0 opacity-10 bg-[url('https://transparenttextures.com/patterns/cubes.png')]" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 relative z-10">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            {school.logo_url && (
              <img src={school.logo_url} alt={school.name} className="w-16 h-16 rounded-full border-4 border-white/20 bg-white" />
            )}
            <h3 className="text-2xl font-bold">{school.name}</h3>
            <p className="text-white/70 max-w-md">{school.description}</p>
          </div>
          <div className="mt-8 border-t border-white/10 pt-8" id="contact">
            {footer}
          </div>
        </div>
      </footer>
    </div>
  );
};

const sections: SectionDefinition[] = [
  { id: 'about', label: 'À propos', component: AboutSection },
  { id: 'cycles', label: 'Programmes', component: CyclesSection },
  { id: 'gallery', label: 'Galerie', optional: true, component: GallerySection },
  { id: 'activities', label: 'Activités', optional: true, component: ActivitiesSection },
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
