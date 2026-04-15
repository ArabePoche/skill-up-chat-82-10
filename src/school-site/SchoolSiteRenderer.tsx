/**
 * SchoolSiteRenderer — Point d'entrée unique qui résout le template
 * et orchestre le rendu des sections avec les données de l'école.
 */
import React, { Suspense } from 'react';
import { Share2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import type { SchoolSiteData, SectionProps, TemplateDefinition } from './types';
import type { School } from '@/school/hooks/useSchool';

interface SchoolSiteRendererProps {
  template: TemplateDefinition;
  data: SchoolSiteData;
  /** Toolbar React node (back, edit, save buttons) */
  toolbar: React.ReactNode;
  /** Draft state pour le mode édition */
  draft: Record<string, any>;
  onDraftChange: (field: string, value: any) => void;
  /** Callbacks pour les actions */
  onJoin: () => void;
  onShare: () => void;
}

const SchoolSiteRenderer: React.FC<SchoolSiteRendererProps> = ({
  template,
  data,
  toolbar,
  draft,
  onDraftChange,
  onJoin,
  onShare,
}) => {
  const { t } = useTranslation();
  const { school, templateConfig } = data;
  const primaryColor = templateConfig.primary_color || school.primary_color || '#3b82f6';

  const socialItems = [
    { key: 'facebook', label: 'Facebook', url: school.site_facebook_url },
    { key: 'instagram', label: 'Instagram', url: school.site_instagram_url },
    { key: 'twitter', label: 'X / Twitter', url: school.site_twitter_url },
    { key: 'linkedin', label: 'LinkedIn', url: school.site_linkedin_url },
    { key: 'youtube', label: 'YouTube', url: school.site_youtube_url },
  ].filter((x) => x.url && x.url.trim());

  // Résoudre les sections du template
  const sectionClass = 'bg-card rounded-xl p-5 shadow-sm border border-border';

  const sectionsRendered = template.sections.map((section) => {
    const SectionComponent = section.component;
    const sectionProps: SectionProps = {
      data,
      primaryColor,
      draft,
      onDraftChange,
    };

    return (
      <section key={section.id} className={sectionClass}>
        <SectionComponent {...sectionProps} />
      </section>
    );
  });

  // Attacher l'événement join aux boutons du layout
  const handleLayoutClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const joinBtn = target.closest('[data-action="join"]');
    if (joinBtn) {
      e.preventDefault();
      onJoin();
    }
  };

  // Footer partagé
  const footer = (
    <footer className="rounded-xl border border-border bg-card/80 p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Button type="button" variant="default" className="w-full sm:w-auto gap-2" onClick={onShare}>
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
      {!data.editMode && socialItems.length === 0 && (
        <p className="text-xs text-center text-muted-foreground">
          {t('school.footerNoSocial', { defaultValue: 'Les liens réseaux sociaux apparaîtront ici une fois renseignés (mode édition).' })}
        </p>
      )}
      <p className="text-xs text-center text-muted-foreground pt-2 border-t border-border">
        © {new Date().getFullYear()} {school.name} •{' '}
        {t('school.allRightsReserved', { defaultValue: 'Tous droits réservés' })}
      </p>
    </footer>
  );

  // Edit mode banner
  const editBanner = data.editMode && data.isOwner ? (
    <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
      {t('school.editSiteHint', {
        defaultValue: 'Vous modifiez le contenu affiché sur ce site public. Enregistrez pour publier les changements.',
      })}
    </div>
  ) : null;

  const Layout = template.Layout;

  return (
    <div onClick={handleLayoutClick}>
      <Layout data={data} toolbar={toolbar} footer={footer}>
        {editBanner}
        {sectionsRendered}
      </Layout>
    </div>
  );
};

export default SchoolSiteRenderer;
