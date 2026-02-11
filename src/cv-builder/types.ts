/**
 * Types pour le constructeur de CV (CV Builder)
 */

export interface CvSection {
  id: string;
  label: string;
  icon: string;
  isAdvanced?: boolean;
  enabled: boolean;
}

export interface PersonalInfo {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  title: string;
  summary: string;
}

export interface Education {
  id: string;
  school: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface Experience {
  id: string;
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
}

export interface Skill {
  id: string;
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

export interface Language {
  id: string;
  name: string;
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'native';
}

export interface Hobby {
  id: string;
  name: string;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  date: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  url: string;
}

export interface Reference {
  id: string;
  name: string;
  position: string;
  company: string;
  phone: string;
  email: string;
}

export interface CvData {
  personalInfo: PersonalInfo;
  education: Education[];
  experiences: Experience[];
  skills: Skill[];
  languages: Language[];
  hobbies: Hobby[];
  certifications: Certification[];
  projects: Project[];
  references: Reference[];
  sectionOrder: string[];
}

export const DEFAULT_SECTIONS: CvSection[] = [
  { id: 'personalInfo', label: 'Informations personnelles', icon: 'User', enabled: true },
  { id: 'education', label: 'Éducation', icon: 'GraduationCap', enabled: true },
  { id: 'experiences', label: 'Expériences', icon: 'Briefcase', enabled: true },
  { id: 'skills', label: 'Compétences', icon: 'Star', enabled: true },
  { id: 'languages', label: 'Langues', icon: 'Globe', enabled: true },
  { id: 'hobbies', label: 'Centres d\'intérêt', icon: 'Heart', enabled: true },
];

export const ADVANCED_SECTIONS: CvSection[] = [
  { id: 'certifications', label: 'Certifications', icon: 'Award', isAdvanced: true, enabled: false },
  { id: 'projects', label: 'Projets', icon: 'FolderOpen', isAdvanced: true, enabled: false },
  { id: 'references', label: 'Références', icon: 'Users', isAdvanced: true, enabled: false },
];
