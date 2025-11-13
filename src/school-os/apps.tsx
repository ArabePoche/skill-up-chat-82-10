// Configuration des applications disponibles dans le système scolaire
import { Users, GraduationCap, BookOpen, Calendar, FileText, Settings, BarChart, Mail } from 'lucide-react';
import { SchoolApp } from './types';

// Composants temporaires pour chaque app
const ClassesApp = () => <div className="p-6"><h2 className="text-2xl font-bold">Gestion des Classes</h2><p className="text-muted-foreground mt-2">Interface de gestion des classes</p></div>;
const TeachersApp = () => <div className="p-6"><h2 className="text-2xl font-bold">Gestion des Enseignants</h2><p className="text-muted-foreground mt-2">Interface de gestion des enseignants</p></div>;
const StudentsApp = () => <div className="p-6"><h2 className="text-2xl font-bold">Gestion des Élèves</h2><p className="text-muted-foreground mt-2">Interface de gestion des élèves</p></div>;
const ScheduleApp = () => <div className="p-6"><h2 className="text-2xl font-bold">Emploi du Temps</h2><p className="text-muted-foreground mt-2">Interface de gestion des emplois du temps</p></div>;
const GradesApp = () => <div className="p-6"><h2 className="text-2xl font-bold">Gestion des Notes</h2><p className="text-muted-foreground mt-2">Interface de gestion des notes</p></div>;
const ReportsApp = () => <div className="p-6"><h2 className="text-2xl font-bold">Rapports</h2><p className="text-muted-foreground mt-2">Interface de génération de rapports</p></div>;
const MessagesApp = () => <div className="p-6"><h2 className="text-2xl font-bold">Messages</h2><p className="text-muted-foreground mt-2">Interface de messagerie</p></div>;
const SettingsApp = () => <div className="p-6"><h2 className="text-2xl font-bold">Paramètres</h2><p className="text-muted-foreground mt-2">Configuration de l'école</p></div>;

export const schoolApps: SchoolApp[] = [
  {
    id: 'classes',
    name: 'Classes',
    icon: 'BookOpen',
    color: 'hsl(var(--primary))',
    component: ClassesApp,
  },
  {
    id: 'teachers',
    name: 'Enseignants',
    icon: 'GraduationCap',
    color: 'hsl(var(--accent))',
    component: TeachersApp,
  },
  {
    id: 'students',
    name: 'Élèves',
    icon: 'Users',
    color: '#10B981',
    component: StudentsApp,
  },
  {
    id: 'schedule',
    name: 'Emploi du temps',
    icon: 'Calendar',
    color: '#F59E0B',
    component: ScheduleApp,
  },
  {
    id: 'grades',
    name: 'Notes',
    icon: 'FileText',
    color: '#EF4444',
    component: GradesApp,
  },
  {
    id: 'reports',
    name: 'Rapports',
    icon: 'BarChart',
    color: '#8B5CF6',
    component: ReportsApp,
  },
  {
    id: 'messages',
    name: 'Messages',
    icon: 'Mail',
    color: '#06B6D4',
    component: MessagesApp,
  },
  {
    id: 'settings',
    name: 'Paramètres',
    icon: 'Settings',
    color: '#6B7280',
    component: SettingsApp,
  },
];

export const getAppById = (id: string) => schoolApps.find(app => app.id === id);
