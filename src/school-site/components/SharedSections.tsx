/**
 * Sections partagées réutilisables par tous les templates.
 * Chaque section reçoit SectionProps et affiche les données de l'école.
 */
import React, { useRef } from 'react';
import {
  Building2, MapPin, Phone, Mail, Globe, Calendar, Languages,
  Users, GraduationCap, BookOpen, BarChart2, Layers, ImageIcon, ExternalLink,
  Upload, X, Camera,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useTranslation } from 'react-i18next';
import type { SectionProps } from '../types';
import { useSchoolSiteUpload } from '../hooks/useSchoolSiteUpload';

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

/** Section Galerie — Upload d'images au lieu d'URLs */
export const GallerySection: React.FC<SectionProps> = ({ data, primaryColor, draft, onDraftChange }) => {
  const { t } = useTranslation();
  const { school, editMode, isOwner } = data;
  const { uploadGalleryImage, isUploading } = useSchoolSiteUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // En mode édition, on travaille avec le draft (tableau d'URLs)
  const galleryUrls: string[] = editMode
    ? (draft?.galleryUrls ?? (school.site_gallery_urls ?? []).filter(Boolean))
    : (school.site_gallery_urls ?? []).filter(Boolean);

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const currentUrls = [...(draft?.galleryUrls ?? galleryUrls)];
    
    for (const file of files) {
      const url = await uploadGalleryImage(file);
      if (url) {
        currentUrls.push(url);
      }
    }
    
    onDraftChange?.('galleryUrls', currentUrls);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number) => {
    const currentUrls = [...(draft?.galleryUrls ?? galleryUrls)];
    currentUrls.splice(index, 1);
    onDraftChange?.('galleryUrls', currentUrls);
  };

  return (
    <>
      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <ImageIcon size={18} style={{ color: primaryColor }} />
        {t('school.gallery', { defaultValue: 'Galerie' })}
      </h2>
      {editMode && isOwner ? (
        <div className="space-y-3">
          {/* Grille des images existantes avec bouton supprimer */}
          {galleryUrls.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {galleryUrls.map((src, i) => (
                <div key={`${src}-${i}`} className="relative aspect-square rounded-lg overflow-hidden border border-border bg-muted group">
                  <img src={src} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {/* Bouton d'upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFilesSelected}
          />
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
            ) : (
              <Upload size={16} />
            )}
            {isUploading
              ? t('school.uploading', { defaultValue: 'Upload en cours…' })
              : t('school.addGalleryImages', { defaultValue: 'Ajouter des photos' })}
          </Button>
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

/** Composant d'upload d'image de couverture (hero) — utilisé par les templates */
export const CoverImageUpload: React.FC<{
  currentUrl?: string | null;
  onUpload: (url: string) => void;
  onRemove: () => void;
}> = ({ currentUrl, onUpload, onRemove }) => {
  const { uploadCover, isUploading } = useSchoolSiteUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadCover(file);
    if (url) onUpload(url);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex items-center gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="gap-1.5 bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
      >
        {isUploading ? (
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
        ) : (
          <Camera size={14} />
        )}
        {currentUrl ? 'Changer la couverture' : 'Ajouter une couverture'}
      </Button>
      {currentUrl && (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="gap-1.5 bg-red-500/20 hover:bg-red-500/30 text-white border-0 backdrop-blur-sm"
          onClick={onRemove}
        >
          <X size={14} />
        </Button>
      )}
    </div>
  );
};
