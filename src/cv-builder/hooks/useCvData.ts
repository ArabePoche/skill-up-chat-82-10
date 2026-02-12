/**
 * Hook de gestion de l'état du CV Builder
 * Gère les données de toutes les sections et l'ordre des sections
 */
import { useState, useCallback } from 'react';
import { CvData, CvSection, DEFAULT_SECTIONS, ADVANCED_SECTIONS } from '../types';

const createId = () => crypto.randomUUID();

const initialCvData: CvData = {
  personalInfo: { fullName: '', email: '', phone: '', address: '', title: '', summary: '' },
  education: [],
  experiences: [],
  skills: [],
  languages: [],
  hobbies: [],
  certifications: [],
  projects: [],
  references: [],
  sectionOrder: DEFAULT_SECTIONS.map(s => s.id),
};

export const useCvData = () => {
  const [cvData, setCvData] = useState<CvData>(initialCvData);
  const [sections, setSections] = useState<CvSection[]>([...DEFAULT_SECTIONS]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const updateSection = useCallback(<K extends keyof CvData>(key: K, value: CvData[K]) => {
    setCvData(prev => ({ ...prev, [key]: value }));
  }, []);

  const toggleAdvancedSection = useCallback((sectionId: string) => {
    setSections(prev => {
      const exists = prev.find(s => s.id === sectionId);
      if (exists) {
        return prev.filter(s => s.id !== sectionId);
      }
      const advSection = ADVANCED_SECTIONS.find(s => s.id === sectionId);
      if (advSection) {
        return [...prev, { ...advSection, enabled: true }];
      }
      return prev;
    });
    setCvData(prev => {
      const hasSection = prev.sectionOrder.includes(sectionId);
      return {
        ...prev,
        sectionOrder: hasSection
          ? prev.sectionOrder.filter(id => id !== sectionId)
          : [...prev.sectionOrder, sectionId],
      };
    });
  }, []);

  const reorderSections = useCallback((newOrder: string[]) => {
    setCvData(prev => ({ ...prev, sectionOrder: newOrder }));
    setSections(prev => {
      const map = new Map(prev.map(s => [s.id, s]));
      return newOrder.map(id => map.get(id)).filter(Boolean) as CvSection[];
    });
  }, []);

  // Helper pour ajouter un item dans une liste
  const addItem = useCallback(<K extends keyof CvData>(key: K, item: any) => {
    setCvData(prev => ({
      ...prev,
      [key]: [...(prev[key] as any[]), { ...item, id: createId() }],
    }));
  }, []);

  const updateItem = useCallback(<K extends keyof CvData>(key: K, id: string, updates: any) => {
    setCvData(prev => ({
      ...prev,
      [key]: (prev[key] as any[]).map((item: any) => item.id === id ? { ...item, ...updates } : item),
    }));
  }, []);

  const removeItem = useCallback(<K extends keyof CvData>(key: K, id: string) => {
    setCvData(prev => ({
      ...prev,
      [key]: (prev[key] as any[]).filter((item: any) => item.id !== id),
    }));
  }, []);

  const setCvDataFull = useCallback((data: CvData) => {
    setCvData(data);
  }, []);

  return {
    cvData,
    setCvData: setCvDataFull,
    sections,
    showAdvanced,
    setShowAdvanced,
    updateSection,
    toggleAdvancedSection,
    reorderSections,
    addItem,
    updateItem,
    removeItem,
  };
};
