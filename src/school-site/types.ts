/**
 * Types partagés pour le système de templates de sites scolaires.
 * Chaque template implémente TemplateDefinition pour être enregistré dans le registry.
 */
import React from 'react';
import { School } from '@/school/hooks/useSchool';

/** Données centralisées passées à chaque template */
export interface SchoolSiteData {
  school: School;
  stats: { students: number; teachers: number; classes: number } | null;
  isOwner: boolean;
  isPersonnel: boolean;
  editMode: boolean;
  templateConfig: Record<string, any>;
}

/** Props de base pour toute section de template */
export interface SectionProps {
  data: SchoolSiteData;
  primaryColor: string;
  /** Callback édition (draft) — optionnel, fourni uniquement en mode édition */
  onDraftChange?: (field: string, value: any) => void;
  draft?: Record<string, any>;
}

/** Définition d'une section configurable */
export interface SectionDefinition {
  id: string;
  label: string;
  /** La section peut être masquée via la config du template */
  optional?: boolean;
  component: React.ComponentType<SectionProps>;
}

/** Contrat qu'implémente chaque template */
export interface TemplateDefinition {
  key: string;
  name: string;
  /** Composant Layout principal qui orchestre les sections */
  Layout: React.ComponentType<TemplateLayoutProps>;
  /** Liste ordonnée des sections disponibles */
  sections: SectionDefinition[];
}

/** Props du Layout principal de chaque template */
export interface TemplateLayoutProps {
  data: SchoolSiteData;
  /** Composants de section déjà résolus et ordonnés */
  children: React.ReactNode;
  /** Toolbar d'édition (back, edit, save, etc.) — injecté par le renderer */
  toolbar?: React.ReactNode;
  /** Footer avec partage + réseaux — injecté par le renderer */
  footer?: React.ReactNode;
}
