/**
 * Sections partagées réutilisables par tous les templates.
 * Chaque section reçoit SectionProps et affiche les données de l'école.
 */
import React from 'react';
import {
  Building2, MapPin, Phone, Mail, Globe, Calendar, Languages,
  Users, GraduationCap, BookOpen, BarChart2, Layers, ImageIcon, ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useTranslation } from 'react-i18next';
import type { SectionProps } from '../types';

/** Section À propos */
export const AboutSection: React.FC<SectionProps> = ({ data, primaryColor }) => {
  const { t } = useTranslation();
  const { school } = data;
  return (
    <>
      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <Building2 size={18} style={{ color: primaryColor }} />
        {t('school.about', { defaultValue: 'À propos' })}
      </h2>
      <p className="text-muted-foreground text-sm leading-relaxed">
        {school.description || t('school.noDescription', { defaultValue: 'Aucune description disponible pour cette école.' })}
      </p>
      {(school.founded_year || school.teaching_language) && (
        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border">
          {school.founded_year && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar size={16} className="text-muted-foreground" />
              <span>{t('school.founded', { defaultValue: 'Fondée en' })} {school.founded_year}</span>
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
    </>
  );
};

/** Section Statistiques */
export const StatsSection: React.FC<SectionProps> = ({ data, primaryColor }) => {
  const { t } = useTranslation();
  const { stats } = data;
  if (!stats || (stats.students === 0 && stats.teachers === 0 && stats.classes === 0)) return null;
  return (
    <>
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <BarChart2 size={18} style={{ color: primaryColor }} />
        {t('school.statistics', { defaultValue: 'Statistiques' })}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
        {stats.students > 0 && (
          <div>
            <div className="text-2xl font-bold" style={{ color: primaryColor }}>{stats.students}</div>
            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-1">
              <Users size={12} /> {t('school.students', { defaultValue: 'Élèves' })}
            </div>
          </div>
        )}
        {stats.teachers > 0 && (
          <div>
            <div className="text-2xl font-bold" style={{ color: primaryColor }}>{stats.teachers}</div>
            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-1">
              <GraduationCap size={12} /> {t('school.teachers', { defaultValue: 'Enseignants' })}
            </div>
          </div>
        )}
        {stats.classes > 0 && (
          <div>
            <div className="text-2xl font-bold" style={{ color: primaryColor }}>{stats.classes}</div>
            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-1">
              <BookOpen size={12} /> {t('school.classes', { defaultValue: 'Classes' })}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

/** Section Cycles et programmes */
export const CyclesSection: React.FC<SectionProps> = ({ data, primaryColor, draft, onDraftChange }) => {
  const { t } = useTranslation();
  const { school, editMode, isOwner } = data;
  const cyclesText = editMode ? (draft?.site_cycles_programs ?? '') : (school.site_cycles_programs ?? '');
  const showEmpty = !cyclesText.trim();

  return (
    <>
      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <Layers size={18} style={{ color: primaryColor }} />
        {t('school.cyclesAndPrograms', { defaultValue: 'Cycles et programmes' })}
      </h2>
      {editMode && isOwner ? (
        <div className="space-y-2">
          <Label>{t('school.cyclesAndProgramsEdit', { defaultValue: 'Texte présenté aux visiteurs' })}</Label>
          <Textarea
            rows={8}
            value={draft?.site_cycles_programs ?? ''}
            onChange={(e) => onDraftChange?.('site_cycles_programs', e.target.value)}
            placeholder={t('school.cyclesPlaceholder', { defaultValue: 'Ex. : Maternelle, Primaire, Collège…' })}
            className="resize-y min-h-[120px]"
          />
        </div>
      ) : showEmpty ? (
        <p className="text-sm text-muted-foreground italic">
          {t('school.cyclesEmpty', { defaultValue: 'Aucune information sur les cycles et programmes pour le moment.' })}
        </p>
      ) : (
        <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
          {school.site_cycles_programs}
        </div>
      )}
    </>
  );
};

/** Section Galerie */
export const GallerySection: React.FC<SectionProps> = ({ data, primaryColor, draft, onDraftChange }) => {
  const { t } = useTranslation();
  const { school, editMode, isOwner } = data;
  const galleryUrls = (school.site_gallery_urls ?? []).filter(Boolean);

  return (
    <>
      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <ImageIcon size={18} style={{ color: primaryColor }} />
        {t('school.gallery', { defaultValue: 'Galerie' })}
      </h2>
      {editMode && isOwner ? (
        <div className="space-y-2">
          <Label>{t('school.galleryEdit', { defaultValue: "Une URL d'image par ligne (https://…)" })}</Label>
          <Textarea
            rows={5}
            value={draft?.galleryText ?? ''}
            onChange={(e) => onDraftChange?.('galleryText', e.target.value)}
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
            <a key={`${src}-${i}`} href={src} target="_blank" rel="noopener noreferrer"
              className="aspect-square rounded-lg overflow-hidden border border-border bg-muted">
              <img src={src} alt="" className="w-full h-full object-cover hover:opacity-90 transition-opacity" />
            </a>
          ))}
        </div>
      )}
    </>
  );
};

/** Section Localisation */
export const LocationSection: React.FC<SectionProps> = ({ data, primaryColor, draft, onDraftChange }) => {
  const { t } = useTranslation();
  const { school, editMode, isOwner } = data;
  const mapQuery = [school.address, school.city, school.country].filter(Boolean).join(', ');
  const mapsHref = mapQuery ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}` : null;

  return (
    <>
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <MapPin size={18} style={{ color: primaryColor }} />
        {t('school.location', { defaultValue: 'Localisation' })}
      </h2>
      {editMode && isOwner ? (
        <div className="space-y-3">
          <div>
            <Label>{t('school.address', { defaultValue: 'Adresse' })}</Label>
            <Input value={draft?.address ?? ''} onChange={(e) => onDraftChange?.('address', e.target.value)} className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t('school.city', { defaultValue: 'Ville' })}</Label>
              <Input value={draft?.city ?? ''} onChange={(e) => onDraftChange?.('city', e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>{t('school.country', { defaultValue: 'Pays' })}</Label>
              <Input value={draft?.country ?? ''} onChange={(e) => onDraftChange?.('country', e.target.value)} className="mt-1" />
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
    </>
  );
};

/** Section Contact */
export const ContactSection: React.FC<SectionProps> = ({ data, primaryColor }) => {
  const { t } = useTranslation();
  const { school } = data;
  if (!school.phone && !school.email && !school.website) return null;
  return (
    <>
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Phone size={18} style={{ color: primaryColor }} />
        {t('school.contact', { defaultValue: 'Contact' })}
      </h2>
      <div className="space-y-3">
        {school.phone && (
          <a href={`tel:${school.phone}`} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
            <Phone size={18} style={{ color: primaryColor }} />
            <span className="text-sm">{school.phone}</span>
          </a>
        )}
        {school.email && (
          <a href={`mailto:${school.email}`} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
            <Mail size={18} style={{ color: primaryColor }} />
            <span className="text-sm">{school.email}</span>
          </a>
        )}
        {school.website && (
          <a href={school.website} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
            <Globe size={18} style={{ color: primaryColor }} />
            <span className="text-sm flex-1">{school.website}</span>
            <ExternalLink size={14} className="text-muted-foreground" />
          </a>
        )}
      </div>
    </>
  );
};

/** Section Réseaux sociaux (mode édition) */
export const SocialEditSection: React.FC<SectionProps> = ({ data, draft, onDraftChange }) => {
  const { t } = useTranslation();
  const { editMode, isOwner } = data;
  if (!editMode || !isOwner) return null;

  const fields = [
    ['site_facebook_url', 'Facebook'],
    ['site_instagram_url', 'Instagram'],
    ['site_twitter_url', 'X / Twitter'],
    ['site_linkedin_url', 'LinkedIn'],
    ['site_youtube_url', 'YouTube'],
  ] as const;

  return (
    <>
      <h2 className="text-lg font-semibold mb-4">{t('school.socialLinks', { defaultValue: 'Réseaux sociaux (footer)' })}</h2>
      <div className="grid gap-3">
        {fields.map(([key, label]) => (
          <div key={key}>
            <Label>{label}</Label>
            <Input
              type="url"
              value={draft?.[key] ?? ''}
              onChange={(e) => onDraftChange?.(key, e.target.value)}
              placeholder="https://"
              className="mt-1"
            />
          </div>
        ))}
      </div>
    </>
  );
};
