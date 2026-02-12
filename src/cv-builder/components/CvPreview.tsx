/**
 * Aperçu en temps réel du CV avec génération PDF via jsPDF
 * Inclut un sélecteur de templates pour personnaliser le rendu
 */
import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { CvData, CvSection } from '../types';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';
import jsPDF from 'jspdf';

interface Props {
  cvData: CvData;
  sections: CvSection[];
  onClose: () => void;
}

type TemplateName = 'classic' | 'modern' | 'elegant' | 'bold';

const TEMPLATES: { id: TemplateName; label: string; accent: string; font: string; bg: string; text: string }[] = [
  { id: 'classic', label: 'Classique', accent: '#2563eb', font: 'Georgia, serif', bg: '#ffffff', text: '#1a1a1a' },
  { id: 'modern', label: 'Moderne', accent: '#06b6d4', font: "'Segoe UI', sans-serif", bg: '#f8fafc', text: '#0f172a' },
  { id: 'elegant', label: 'Élégant', accent: '#7c3aed', font: "'Palatino Linotype', serif", bg: '#faf5ff', text: '#1e1b4b' },
  { id: 'bold', label: 'Audacieux', accent: '#dc2626', font: "'Arial Black', sans-serif", bg: '#fef2f2', text: '#1c1917' },
];

const CvPreview: React.FC<Props> = ({ cvData, sections, onClose }) => {
  const [template, setTemplate] = useState<TemplateName>('classic');
  const tpl = TEMPLATES.find(t => t.id === template)!;

  const generatePdf = () => {
    const doc = new jsPDF();
    let y = 20;
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const maxWidth = pageWidth - margin * 2;

    const addLine = (text: string, size = 10, bold = false) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFontSize(size);
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      const lines = doc.splitTextToSize(text, maxWidth);
      doc.text(lines, margin, y);
      y += lines.length * (size * 0.5) + 2;
    };

    const addSectionTitle = (title: string) => {
      y += 4;
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setDrawColor(100, 100, 100);
      doc.line(margin, y, pageWidth - margin, y);
      y += 5;
      addLine(title, 13, true);
      y += 2;
    };

    for (const sectionId of cvData.sectionOrder) {
      switch (sectionId) {
        case 'personalInfo': {
          const p = cvData.personalInfo;
          if (p.fullName) addLine(p.fullName, 18, true);
          if (p.title) addLine(p.title, 12, false);
          const contact = [p.email, p.phone, p.address].filter(Boolean).join(' • ');
          if (contact) addLine(contact, 9);
          if (p.summary) { y += 3; addLine(p.summary, 10); }
          break;
        }
        case 'education':
          if (cvData.education.length > 0) {
            addSectionTitle('Éducation');
            cvData.education.forEach(e => {
              addLine(`${e.degree} ${e.field} — ${e.school}`, 11, true);
              if (e.startDate || e.endDate) addLine(`${e.startDate} - ${e.endDate}`, 9);
              if (e.description) addLine(e.description, 9);
            });
          }
          break;
        case 'experiences':
          if (cvData.experiences.length > 0) {
            addSectionTitle('Expériences');
            cvData.experiences.forEach(e => {
              addLine(`${e.position} — ${e.company}`, 11, true);
              addLine(`${e.startDate} - ${e.current ? 'Présent' : e.endDate}`, 9);
              if (e.description) addLine(e.description, 9);
            });
          }
          break;
        case 'skills':
          if (cvData.skills.length > 0) {
            addSectionTitle('Compétences');
            addLine(cvData.skills.map(s => `${s.name} (${s.level})`).join(', '), 10);
          }
          break;
        case 'languages':
          if (cvData.languages.length > 0) {
            addSectionTitle('Langues');
            addLine(cvData.languages.map(l => `${l.name} — ${l.level}`).join(', '), 10);
          }
          break;
        case 'hobbies':
          if (cvData.hobbies.length > 0) {
            addSectionTitle("Centres d'intérêt");
            addLine(cvData.hobbies.map(h => h.name).filter(Boolean).join(', '), 10);
          }
          break;
        case 'certifications':
          if (cvData.certifications.length > 0) {
            addSectionTitle('Certifications');
            cvData.certifications.forEach(c => addLine(`${c.name} — ${c.issuer} (${c.date})`, 10));
          }
          break;
        case 'projects':
          if (cvData.projects.length > 0) {
            addSectionTitle('Projets');
            cvData.projects.forEach(p => {
              addLine(p.name, 11, true);
              if (p.description) addLine(p.description, 9);
              if (p.url) addLine(p.url, 8);
            });
          }
          break;
        case 'references':
          if (cvData.references.length > 0) {
            addSectionTitle('Références');
            cvData.references.forEach(r => addLine(`${r.name} — ${r.position}, ${r.company} | ${r.phone} | ${r.email}`, 9));
          }
          break;
      }
    }
    doc.save('mon-cv.pdf');
  };

  const renderSection = (sectionId: string) => {
    const headingStyle = { color: tpl.accent, borderBottom: `2px solid ${tpl.accent}` };

    switch (sectionId) {
      case 'personalInfo': {
        const p = cvData.personalInfo;
        return (
          <div key={sectionId} className="text-center mb-5 pb-4" style={{ borderBottom: `3px solid ${tpl.accent}` }}>
            {p.fullName && <h2 className="text-2xl font-bold" style={{ color: tpl.accent }}>{p.fullName}</h2>}
            {p.title && <p className="text-sm mt-1 opacity-80">{p.title}</p>}
            <p className="text-xs opacity-60 mt-1">{[p.email, p.phone, p.address].filter(Boolean).join(' • ')}</p>
            {p.summary && <p className="text-xs mt-3 leading-relaxed">{p.summary}</p>}
          </div>
        );
      }
      case 'education':
        return cvData.education.length > 0 ? (
          <div key={sectionId} className="mb-4">
            <h3 className="text-sm font-bold pb-1 mb-2" style={headingStyle}>Éducation</h3>
            {cvData.education.map(e => (
              <div key={e.id} className="mb-2">
                <p className="text-xs font-semibold">{e.degree} {e.field} — {e.school}</p>
                <p className="text-[10px] opacity-60">{e.startDate} - {e.endDate}</p>
              </div>
            ))}
          </div>
        ) : null;
      case 'experiences':
        return cvData.experiences.length > 0 ? (
          <div key={sectionId} className="mb-4">
            <h3 className="text-sm font-bold pb-1 mb-2" style={headingStyle}>Expériences</h3>
            {cvData.experiences.map(e => (
              <div key={e.id} className="mb-2">
                <p className="text-xs font-semibold">{e.position} — {e.company}</p>
                <p className="text-[10px] opacity-60">{e.startDate} - {e.current ? 'Présent' : e.endDate}</p>
              </div>
            ))}
          </div>
        ) : null;
      case 'skills':
        return cvData.skills.length > 0 ? (
          <div key={sectionId} className="mb-4">
            <h3 className="text-sm font-bold pb-1 mb-2" style={headingStyle}>Compétences</h3>
            <p className="text-xs">{cvData.skills.map(s => s.name).join(', ')}</p>
          </div>
        ) : null;
      case 'languages':
        return cvData.languages.length > 0 ? (
          <div key={sectionId} className="mb-4">
            <h3 className="text-sm font-bold pb-1 mb-2" style={headingStyle}>Langues</h3>
            <p className="text-xs">{cvData.languages.map(l => `${l.name} (${l.level})`).join(', ')}</p>
          </div>
        ) : null;
      case 'hobbies':
        return cvData.hobbies.length > 0 ? (
          <div key={sectionId} className="mb-4">
            <h3 className="text-sm font-bold pb-1 mb-2" style={headingStyle}>Centres d'intérêt</h3>
            <p className="text-xs">{cvData.hobbies.map(h => h.name).filter(Boolean).join(', ')}</p>
          </div>
        ) : null;
      case 'certifications':
        return cvData.certifications.length > 0 ? (
          <div key={sectionId} className="mb-4">
            <h3 className="text-sm font-bold pb-1 mb-2" style={headingStyle}>Certifications</h3>
            {cvData.certifications.map(c => <p key={c.id} className="text-xs">{c.name} — {c.issuer}</p>)}
          </div>
        ) : null;
      case 'projects':
        return cvData.projects.length > 0 ? (
          <div key={sectionId} className="mb-4">
            <h3 className="text-sm font-bold pb-1 mb-2" style={headingStyle}>Projets</h3>
            {cvData.projects.map(p => <p key={p.id} className="text-xs font-semibold">{p.name}</p>)}
          </div>
        ) : null;
      case 'references':
        return cvData.references.length > 0 ? (
          <div key={sectionId} className="mb-4">
            <h3 className="text-sm font-bold pb-1 mb-2" style={headingStyle}>Références</h3>
            {cvData.references.map(r => <p key={r.id} className="text-xs">{r.name} — {r.position}, {r.company}</p>)}
          </div>
        ) : null;
      default:
        return null;
    }
  };

  // Render via portal to escape Dialog z-index
  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[99999] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-bold text-lg">Aperçu du CV</h2>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={generatePdf}><Download className="w-4 h-4 mr-1" /> PDF</Button>
            <Button size="icon" variant="ghost" onClick={onClose}><X className="w-4 h-4" /></Button>
          </div>
        </div>

        {/* Template selector */}
        <div className="px-4 py-3 border-b border-border">
          <p className="text-xs font-medium text-muted-foreground mb-2">Choisissez un template :</p>
          <div className="flex gap-2 flex-wrap">
            {TEMPLATES.map(t => (
              <button
                key={t.id}
                onClick={() => setTemplate(t.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all ${
                  template === t.id ? 'scale-105 shadow-md' : 'opacity-70 hover:opacity-100'
                }`}
                style={{
                  borderColor: t.accent,
                  backgroundColor: template === t.id ? t.accent : 'transparent',
                  color: template === t.id ? '#fff' : t.accent,
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* CV preview */}
        <div className="flex-1 overflow-auto p-6">
          <div className="rounded-lg p-8 shadow-inner min-h-[500px]" style={{ fontFamily: tpl.font, backgroundColor: tpl.bg, color: tpl.text }}>
            {cvData.sectionOrder.map(id => renderSection(id))}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CvPreview;
