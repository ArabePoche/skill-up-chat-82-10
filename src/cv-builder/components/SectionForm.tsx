/**
 * Routeur de formulaires - affiche le formulaire correspondant à la section sélectionnée
 */
import React from 'react';
import { CvData } from '../types';
import PersonalInfoForm from './forms/PersonalInfoForm';
import EducationForm from './forms/EducationForm';
import ExperienceForm from './forms/ExperienceForm';
import SkillsForm from './forms/SkillsForm';
import LanguagesForm from './forms/LanguagesForm';
import HobbiesForm from './forms/HobbiesForm';
import CertificationsForm from './forms/CertificationsForm';
import ProjectsForm from './forms/ProjectsForm';
import ReferencesForm from './forms/ReferencesForm';

interface Props {
  activeSection: string;
  cvData: CvData;
  updateSection: <K extends keyof CvData>(key: K, value: CvData[K]) => void;
  addItem: <K extends keyof CvData>(key: K, item: any) => void;
  updateItem: <K extends keyof CvData>(key: K, id: string, updates: any) => void;
  removeItem: <K extends keyof CvData>(key: K, id: string) => void;
}

const SectionForm: React.FC<Props> = ({ activeSection, cvData, updateSection, addItem, updateItem, removeItem }) => {
  switch (activeSection) {
    case 'personalInfo':
      return <PersonalInfoForm data={cvData.personalInfo} onChange={v => updateSection('personalInfo', v)} />;
    case 'education':
      return <EducationForm data={cvData.education} onAdd={i => addItem('education', i)} onUpdate={(id, u) => updateItem('education', id, u)} onRemove={id => removeItem('education', id)} />;
    case 'experiences':
      return <ExperienceForm data={cvData.experiences} onAdd={i => addItem('experiences', i)} onUpdate={(id, u) => updateItem('experiences', id, u)} onRemove={id => removeItem('experiences', id)} />;
    case 'skills':
      return <SkillsForm data={cvData.skills} onAdd={i => addItem('skills', i)} onUpdate={(id, u) => updateItem('skills', id, u)} onRemove={id => removeItem('skills', id)} />;
    case 'languages':
      return <LanguagesForm data={cvData.languages} onAdd={i => addItem('languages', i)} onUpdate={(id, u) => updateItem('languages', id, u)} onRemove={id => removeItem('languages', id)} />;
    case 'hobbies':
      return <HobbiesForm data={cvData.hobbies} onAdd={i => addItem('hobbies', i)} onUpdate={(id, u) => updateItem('hobbies', id, u)} onRemove={id => removeItem('hobbies', id)} />;
    case 'certifications':
      return <CertificationsForm data={cvData.certifications} onAdd={i => addItem('certifications', i)} onUpdate={(id, u) => updateItem('certifications', id, u)} onRemove={id => removeItem('certifications', id)} />;
    case 'projects':
      return <ProjectsForm data={cvData.projects} onAdd={i => addItem('projects', i)} onUpdate={(id, u) => updateItem('projects', id, u)} onRemove={id => removeItem('projects', id)} />;
    case 'references':
      return <ReferencesForm data={cvData.references} onAdd={i => addItem('references', i)} onUpdate={(id, u) => updateItem('references', id, u)} onRemove={id => removeItem('references', id)} />;
    default:
      return <div className="text-muted-foreground text-sm p-4">Sélectionnez une section à gauche.</div>;
  }
};

export default SectionForm;
