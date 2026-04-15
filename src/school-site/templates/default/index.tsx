/**
 * Template Default — Layout classique vertical (design actuel).
 * Sections empilées dans un conteneur centré, hero avec gradient.
 */
import React from 'react';
import { Building2, MapPin, UserPlus, School as SchoolIcon } from 'lucide-react';
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

/** Layout principal du template Default */
const DefaultLayout: React.FC<TemplateLayoutProps> = ({ data, children, toolbar, footer }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { school, templateConfig, isPersonnel, editMode, isOwner } = data;

  const primaryColor = templateConfig.primary_color || school.primary_color || '#3b82f6';
  const secondaryColor = templateConfig.secondary_color || school.secondary_color || '#1e40af';
  const coverUrl = data.draft?.site_cover_url ?? school.site_cover_url;

  return (
    <div className="min-h-screen pb-24 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="max-w-2xl mx-auto px-4 py-4 space-y-6"
      >
        {/* Hero */}
        <div className="relative rounded-xl overflow-hidden"
          style={{
            background: coverUrl
              ? undefined
              : `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
          }}>
          {/* Image de couverture */}
          {coverUrl && (
            <div className="absolute inset-0">
              <img src={coverUrl} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40" />
            </div>
          )}

          {/* Toolbar (back, edit, save) */}
          <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-2">
            {toolbar}
          </div>

          {/* Bouton upload couverture en mode édition */}
          {editMode && isOwner && (
            <div className="absolute top-4 right-4 z-10">
              <CoverImageUpload
                currentUrl={coverUrl}
                onUpload={(url) => data.onDraftChange?.('site_cover_url', url)}
                onRemove={() => data.onDraftChange?.('site_cover_url', '')}
              />
            </div>
          )}

          <div className="relative px-6 pt-20 pb-10 text-white">
            <div className="flex items-center gap-6 mb-4">
              <div className="w-28 h-28 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/40 shadow-xl flex items-center justify-center overflow-hidden shrink-0">
                {school.logo_url ? (
                  <img src={school.logo_url} alt={school.name} className="w-full h-full object-cover" />
                ) : (
                  <Building2 size={48} className="text-white" />
                )}
              </div>
              <div className="text-left">
                <h1 className="text-2xl font-bold">{school.name}</h1>
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/20 text-white shadow-sm backdrop-blur-md">
                    {getSchoolTypeLabel(school.school_type)}
                  </span>
                  {school.city && (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 bg-white/20 text-white shadow-sm backdrop-blur-md">
                      <MapPin size={10} />{school.city}
                    </span>
                  )}
                  {school.country && (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/20 text-white shadow-sm backdrop-blur-md">
                      {school.country}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {user && (
              <div className="flex flex-wrap gap-2 mt-6">
                <Button onClick={() => {}} className="flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border-0" variant="outline"
                  data-action="join">
                  <UserPlus size={18} />
                  {t('school.joinSchool', { defaultValue: 'Rejoindre cette école' })}
                </Button>
                {isPersonnel && (
                  <Button onClick={() => navigate(`/school?id=${school.id}`)}
                    className="flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border-0" variant="outline">
                    <SchoolIcon size={18} />
                    {t('school.accessSchoolOS', { defaultValue: 'Accéder à School-OS' })}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sections */}
        {children}

        {/* Footer */}
        {footer}
      </motion.div>
    </div>
  );
};

const sections: SectionDefinition[] = [
  { id: 'about', label: 'À propos', component: AboutSection },
  { id: 'stats', label: 'Statistiques', optional: true, component: StatsSection },
  { id: 'cycles', label: 'Cycles et programmes', component: CyclesSection },
  { id: 'gallery', label: 'Galerie', optional: true, component: GallerySection },
  { id: 'location', label: 'Localisation', component: LocationSection },
  { id: 'contact', label: 'Contact', optional: true, component: ContactSection },
  { id: 'social-edit', label: 'Réseaux sociaux', optional: true, component: SocialEditSection },
];

const defaultTemplate: TemplateDefinition = {
  key: 'default',
  name: 'Classique',
  Layout: DefaultLayout,
  sections,
};

export default defaultTemplate;
