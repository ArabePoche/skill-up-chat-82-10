/**
 * Template Futuriste — Layout tech, sombre, néon, éléments flottants.
 */
import React from 'react';
import { MapPin, UserPlus, School as SchoolIcon, ChevronDown, Zap, Cpu } from 'lucide-react';
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

/** En-tête avec effet "Glow" (Header fixe) */
const FuturisticHeader: React.FC<{ 
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
      className="sticky top-0 z-50 border-b bg-slate-950/60 backdrop-blur-2xl"
      style={{ borderBottomColor: `${primaryColor}40` }}
    >
      <div className="absolute inset-x-0 bottom-0 h-px w-full"
           style={{ background: `linear-gradient(90deg, transparent, ${primaryColor}, transparent)` }} />
      <div className="max-w-screen-xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* À gauche : Logo et nom avec effet néon */}
        <div className="flex items-center gap-4">
          <div className="relative">
            {displayLogo ? (
              <img src={displayLogo} alt={school.name} className="w-10 h-10 rounded-xl border border-white/10 bg-slate-900 object-cover shadow-[0_0_15px_-3px] shadow-[var(--primary)]" style={{ '--primary': primaryColor } as any} />
            ) : (
              <div className="w-10 h-10 rounded-xl border border-white/10 bg-slate-900 flex items-center justify-center shadow-[0_0_15px_-3px] shadow-[var(--primary)]" style={{ '--primary': primaryColor } as any}>
                <Zap className="w-5 h-5 text-white" />
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
          <span 
            className="text-white font-extrabold tracking-wider text-xl hidden sm:block truncate max-w-[200px] lg:max-w-md drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]"
          >
            {school.name}
          </span>
        </div>
        {/* À droite : Menus type console */}
        <nav className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-slate-300 hover:text-white border border-transparent hover:border-slate-700 rounded-md transition-all whitespace-nowrap"
            >
              <span className="opacity-50 mr-1">&gt;</span>{link.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
};

const FuturisticLayout: React.FC<TemplateLayoutProps> = ({ data, children, toolbar, footer }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { school, templateConfig, isPersonnel, stats, editMode, isOwner } = data;

  const primaryColor = templateConfig.primary_color || school.primary_color || '#8b5cf6';
  const secondaryColor = templateConfig.secondary_color || school.secondary_color || '#3b82f6';
  const coverUrl = data.draft?.site_cover_url ?? school.site_cover_url;

  return (
    <div id="top" className="min-h-screen flex flex-col bg-slate-950 text-slate-200 selection:bg-[var(--primary)] selection:text-white"
         style={{ '--primary': primaryColor } as any}>
      <FuturisticHeader 
        school={school} 
        primaryColor={primaryColor} 
        secondaryColor={secondaryColor}
        editMode={editMode}
        isOwner={isOwner}
        currentLogoUrl={data.draft?.logo_url ?? school.logo_url}
        onDraftChange={data.onDraftChange}
      />

      <main className="flex-1 relative overflow-hidden">
        {/* Background Grid & Orbs */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
          <motion.div 
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px]"
            style={{ background: primaryColor }}
          />
          <motion.div 
            animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
            className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[150px]"
            style={{ background: secondaryColor }}
          />
        </div>

        {/* Hero Section */}
        <div className="relative z-10 w-full min-h-[500px] lg:min-h-[600px] flex flex-col justify-center">
          {/* Couverture avec masque cybernétique */}
          {coverUrl && (
            <div className="absolute inset-0 z-[-1] overflow-hidden">
              <img src={coverUrl} alt="" className="w-full h-full object-cover opacity-40 mix-blend-luminosity grayscale-[30%]" />
              <div className="absolute inset-0 bg-gradient-to-b from-slate-950/60 via-transparent to-slate-950" />
            </div>
          )}

          {/* Toolbar & Badges */}
          <div className="absolute top-6 left-6 z-20 flex flex-wrap gap-2">
            {toolbar}
          </div>
          <div className="absolute top-6 right-6 z-20 flex items-center gap-3">
            {editMode && isOwner && (
              <CoverImageUpload
                currentUrl={coverUrl}
                onUpload={(url) => data.onDraftChange?.('site_cover_url', url)}
                onRemove={() => data.onDraftChange?.('site_cover_url', '')}
              />
            )}
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-bold tracking-widest uppercase border rounded bg-slate-900/80 backdrop-blur-sm"
                  style={{ color: primaryColor, borderColor: `${primaryColor}50`, boxShadow: `0 0 10px ${primaryColor}20` }}>
              <Cpu size={12} /> NEXUS
            </span>
          </div>

          {/* Text Content */}
          <div className="relative w-full max-w-screen-xl mx-auto px-6 py-20 lg:py-32">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="max-w-3xl"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full border border-slate-700 bg-slate-800/50 backdrop-blur-xl text-xs font-mono text-slate-300">
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: primaryColor }} />
                RÉSEAU ÉDUCATIF EN LIGNE
              </div>
              
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white mb-6 uppercase"
                  style={{ textShadow: `0 0 40px ${primaryColor}60` }}>
                {school.name}
              </h1>
              
              <p className="text-lg sm:text-xl text-slate-300 mb-8 max-w-2xl leading-relaxed font-light border-l-2 pl-4"
                 style={{ borderLeftColor: primaryColor }}>
                {school.description
                  ? school.description.substring(0, 180) + (school.description.length > 180 ? '…' : '')
                  : t('school.noDescription', { defaultValue: 'Système éducatif en attente d\'initialisation.' })}
              </p>
            </motion.div>
          </div>
        </div>

        {/* Data Bar (Stats & Actions) */}
        <div className="relative z-20 max-w-screen-xl mx-auto px-4 sm:px-6 -mt-10">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-1 border rounded-2xl bg-slate-900/60 backdrop-blur-xl shadow-2xl"
            style={{ borderColor: `${primaryColor}30` }}
          >
            <div className="flex-1 flex flex-wrap items-center gap-4 py-4 px-6">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-400">
                <span className="p-1.5 rounded-md bg-slate-800 text-white"><MapPin size={14} /></span>
                {school.city || 'LOCATION_UNK'} {school.country ? `/ ${school.country}` : ''}
              </div>
              <div className="h-4 w-px bg-slate-700 hidden md:block" />
              <div className="flex items-center gap-2 text-xs font-mono border rounded-md px-2 py-1 uppercase"
                   style={{ borderColor: `${secondaryColor}40`, color: secondaryColor }}>
                {getSchoolTypeLabel(school.school_type)}
              </div>
              
              {stats && (stats.students > 0 || stats.teachers > 0 || stats.classes > 0) && (
                <>
                  <div className="h-4 w-px bg-slate-700 hidden md:block" />
                  <div className="flex gap-6 font-mono">
                    {stats.students > 0 && (
                      <div className="flex flex-col">
                        <span className="text-xl font-bold text-white">{stats.students}</span>
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest">USR</span>
                      </div>
                    )}
                    {stats.teachers > 0 && (
                      <div className="flex flex-col">
                        <span className="text-xl font-bold text-white">{stats.teachers}</span>
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest">MNT</span>
                      </div>
                    )}
                    {stats.classes > 0 && (
                      <div className="flex flex-col">
                        <span className="text-xl font-bold text-white">{stats.classes}</span>
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest">GRP</span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* CTAs */}
            {user && (
              <div className="flex gap-2 p-2">
                <Button
                  data-action="join"
                  id="join"
                  className="gap-2 px-6 py-5 text-sm font-bold font-mono tracking-wide rounded-xl shadow-lg transition-all hover:scale-105 text-white border-b-4 active:border-b-0 active:translate-y-1"
                  style={{ backgroundColor: primaryColor, borderBottomColor: `${secondaryColor}80` }}
                >
                  <Zap size={16} />
                  INTÉGRER
                </Button>
                {isPersonnel && (
                  <Button
                    onClick={() => navigate(`/school?id=${school.id}`)}
                    className="gap-2 px-6 py-5 text-sm font-bold font-mono tracking-wide rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-white transition-all hover:-translate-y-1"
                  >
                    <SchoolIcon size={16} />
                    SYSTÈME OS
                  </Button>
                )}
              </div>
            )}
          </motion.div>
        </div>

        {/* Content Body */}
        <div className="relative z-10 max-w-screen-xl mx-auto px-4 sm:px-6 py-20 space-y-24">
          {children}
        </div>
      </main>

      {/* Cyber Footer */}
      <footer className="relative z-20 border-t border-slate-800 bg-slate-950 py-16 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_14px]" />
        <div className="absolute top-0 inset-x-0 h-px w-full"
             style={{ background: `linear-gradient(90deg, transparent, ${secondaryColor}80, transparent)` }} />
        
        <div className="max-w-screen-xl mx-auto px-4 relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-12">
            <div className="flex items-center gap-4">
              {school.logo_url && (
                <img src={school.logo_url} alt={school.name} className="w-12 h-12 rounded-lg border border-slate-700 grayscale hover:grayscale-0 transition-all opacity-80" />
              )}
              <div>
                <h3 className="text-xl font-black uppercase text-white font-mono">{school.name}</h3>
                <p className="text-xs text-slate-500 font-mono tracking-widest hover:text-slate-300">SYSTEM.NEXUS.ONLINE</p>
              </div>
            </div>
            
            <div className="flex items-center gap-6 text-sm font-mono text-slate-500">
              <a href="#top" className="hover:text-white transition-colors">INIT</a>
              <a href="#cycles" className="hover:text-white transition-colors">DATA</a>
              <a href="#contact" className="hover:text-white transition-colors">COMM</a>
            </div>
          </div>
          
          <div className="pt-8 border-t border-slate-800 flex justify-center" id="contact">
            {footer}
          </div>
        </div>
      </footer>
    </div>
  );
};

// Injection de styles sombres pour les SharedSections génériques (surcharges via classes parente existantes, ici on assure juste que le fond est sombre dans SharedSections)
// SharedSections utilisent généralement les couleurs via dark: classes. On force le mode sombre sur la vue en forçant la hiérarchie. On ajoute id/classe si besoin :
// "dark" classe est déduite d'un provider global la majorité du temps, mais on utilise "dark" sur le div parent de 'futuristic' ? 
// Pout ne pas casser globalement, ce template se repose sur les classes `dark:`, mais si l'app est en light, ça risque de pas suffire s'il n'y a pas ".dark".
// On ajoutera "dark" à la racine de la classe.

const FuturisticWrapper: React.FC<TemplateLayoutProps> = (props) => (
  <div className="dark"> 
    <FuturisticLayout {...props} />
  </div>
);

const sections: SectionDefinition[] = [
  { id: 'about', label: 'Initialisation', component: AboutSection },
  { id: 'cycles', label: 'Programmes', component: CyclesSection },
  { id: 'gallery', label: 'Données Visuelles', optional: true, component: GallerySection },
  { id: 'activities', label: 'Rapports', optional: true, component: ActivitiesSection },
  { id: 'location', label: 'Géo-Data', component: LocationSection },
  { id: 'contact', label: 'Liaison', optional: true, component: ContactSection },
  { id: 'social-edit', label: 'Réseaux Externes', optional: true, component: SocialEditSection },
];

const futuristicTemplate: TemplateDefinition = {
  key: 'futuristic',
  name: 'Futuriste (Cyber)',
  Layout: FuturisticWrapper,
  sections,
};

export default futuristicTemplate;