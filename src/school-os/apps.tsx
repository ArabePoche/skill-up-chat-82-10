// Configuration des applications disponibles dans le système scolaire
import { lazy } from 'react';
import { Users, GraduationCap, BookOpen, Calendar, FileText, Settings, BarChart, Mail, CreditCard, Wallet } from 'lucide-react';
import { SchoolApp } from './types';

// Lazy loading des applications pour optimiser les performances
const ClassesApp = lazy(() => import('./apps/classes/ClassesApp').then(m => ({ default: m.ClassesApp })));
const TeachersApp = lazy(() => import('./apps/teachers/TeachersApp').then(m => ({ default: m.TeachersApp })));
const StudentsApp = lazy(() => import('./apps/students/StudentsApp').then(m => ({ default: m.StudentsApp })));
const PaymentsApp = lazy(() => import('./apps/payments').then(m => ({ default: m.PaymentsApp })));
const AccountingApp = lazy(() => import('./apps/accounting/AccountingApp').then(m => ({ default: m.AccountingApp })));
const ScheduleApp = lazy(() => import('./apps/schedule/ScheduleApp').then(m => ({ default: m.ScheduleApp })));
const GradesApp = lazy(() => import('./apps/grades/GradesApp').then(m => ({ default: m.GradesApp })));
const ReportsApp = lazy(() => import('./apps/reports/ReportsApp').then(m => ({ default: m.ReportsApp })));
const MessagesApp = lazy(() => import('./apps/messages/MessagesApp').then(m => ({ default: m.MessagesApp })));
const SettingsApp = lazy(() => import('./apps/settings/SettingsApp').then(m => ({ default: m.SettingsApp })));

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
    id: 'payments',
    name: 'Paiements',
    icon: 'CreditCard',
    color: '#8B5CF6',
    component: PaymentsApp,
  },
  {
    id: 'accounting',
    name: 'Comptabilité',
    icon: 'Wallet',
    color: '#10B981',
    component: AccountingApp,
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
