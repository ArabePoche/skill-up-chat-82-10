/**
 * Aperçu en temps réel du CV avec génération PDF via jsPDF
 */
import React from 'react';
import { CvData, CvSection } from '../types';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';
import jsPDF from 'jspdf';

interface Props {
  cvData: CvData;
  sections: CvSection[];
  onClose: () => void;
}

const CvPreview: React.FC<Props> = ({ cvData, sections, onClose }) => {
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

    // Render sections in order
    for (const sectionId of cvData.sectionOrder) {
      const section = sections.find(s => s.id === sectionId);
      if (!section) continue;

      switch (sectionId) {
        case 'personalInfo': {
          const p = cvData.personalInfo;
          if (p.fullName) { addLine(p.fullName, 18, true); }
          if (p.title) { addLine(p.title, 12, false); }
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
            addSectionTitle('Centres d\'intérêt');
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

  // Render HTML preview
  const renderSection = (sectionId: string) => {
    switch (sectionId) {
      case 'personalInfo': {
        const p = cvData.personalInfo;
        return (
          <div key={sectionId} className="text-center mb-4">
            {p.fullName && <h2 className="text-xl font-bold">{p.fullName}</h2>}
            {p.title && <p className="text-sm text-muted-foreground">{p.title}</p>}
            <p className="text-xs text-muted-foreground mt-1">{[p.email, p.phone, p.address].filter(Boolean).join(' • ')}</p>
            {p.summary && <p className="text-xs mt-2">{p.summary}</p>}
          </div>
        );
      }
      case 'education':
        return cvData.education.length > 0 ? (
          <div key={sectionId} className="mb-3">
            <h3 className="text-sm font-bold border-b border-border pb-1 mb-2">Éducation</h3>
            {cvData.education.map(e => (
              <div key={e.id} className="mb-1.5">
                <p className="text-xs font-semibold">{e.degree} {e.field} — {e.school}</p>
                <p className="text-[10px] text-muted-foreground">{e.startDate} - {e.endDate}</p>
              </div>
            ))}
          </div>
        ) : null;
      case 'experiences':
        return cvData.experiences.length > 0 ? (
          <div key={sectionId} className="mb-3">
            <h3 className="text-sm font-bold border-b border-border pb-1 mb-2">Expériences</h3>
            {cvData.experiences.map(e => (
              <div key={e.id} className="mb-1.5">
                <p className="text-xs font-semibold">{e.position} — {e.company}</p>
                <p className="text-[10px] text-muted-foreground">{e.startDate} - {e.current ? 'Présent' : e.endDate}</p>
              </div>
            ))}
          </div>
        ) : null;
      case 'skills':
        return cvData.skills.length > 0 ? (
          <div key={sectionId} className="mb-3">
            <h3 className="text-sm font-bold border-b border-border pb-1 mb-2">Compétences</h3>
            <p className="text-xs">{cvData.skills.map(s => s.name).join(', ')}</p>
          </div>
        ) : null;
      case 'languages':
        return cvData.languages.length > 0 ? (
          <div key={sectionId} className="mb-3">
            <h3 className="text-sm font-bold border-b border-border pb-1 mb-2">Langues</h3>
            <p className="text-xs">{cvData.languages.map(l => `${l.name} (${l.level})`).join(', ')}</p>
          </div>
        ) : null;
      case 'hobbies':
        return cvData.hobbies.length > 0 ? (
          <div key={sectionId} className="mb-3">
            <h3 className="text-sm font-bold border-b border-border pb-1 mb-2">Centres d'intérêt</h3>
            <p className="text-xs">{cvData.hobbies.map(h => h.name).filter(Boolean).join(', ')}</p>
          </div>
        ) : null;
      case 'certifications':
        return cvData.certifications.length > 0 ? (
          <div key={sectionId} className="mb-3">
            <h3 className="text-sm font-bold border-b border-border pb-1 mb-2">Certifications</h3>
            {cvData.certifications.map(c => <p key={c.id} className="text-xs">{c.name} — {c.issuer}</p>)}
          </div>
        ) : null;
      case 'projects':
        return cvData.projects.length > 0 ? (
          <div key={sectionId} className="mb-3">
            <h3 className="text-sm font-bold border-b border-border pb-1 mb-2">Projets</h3>
            {cvData.projects.map(p => <p key={p.id} className="text-xs font-semibold">{p.name}</p>)}
          </div>
        ) : null;
      case 'references':
        return cvData.references.length > 0 ? (
          <div key={sectionId} className="mb-3">
            <h3 className="text-sm font-bold border-b border-border pb-1 mb-2">Références</h3>
            {cvData.references.map(r => <p key={r.id} className="text-xs">{r.name} — {r.position}, {r.company}</p>)}
          </div>
        ) : null;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-background rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-bold text-lg">Aperçu du CV</h2>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={generatePdf}><Download className="w-4 h-4 mr-1" /> Télécharger PDF</Button>
            <Button size="icon" variant="ghost" onClick={onClose}><X className="w-4 h-4" /></Button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-6">
          <div className="bg-white text-black rounded-lg p-8 shadow-inner min-h-[500px]" style={{ fontFamily: 'Georgia, serif' }}>
            {cvData.sectionOrder.map(id => renderSection(id))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CvPreview;
