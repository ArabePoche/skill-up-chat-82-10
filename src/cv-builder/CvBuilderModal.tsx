/**
 * Modal principal du CV Builder
 * Layout : panneau gauche (sections drag & drop) + panneau droit (formulaire)
 * Sur mobile : navigation par onglets
 */
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Eye, ArrowLeft } from 'lucide-react';
import { useCvData } from './hooks/useCvData';
import SectionList from './components/SectionList';
import SectionForm from './components/SectionForm';
import CvPreview from './components/CvPreview';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CvBuilderModal: React.FC<Props> = ({ open, onOpenChange }) => {
  const {
    cvData, sections, showAdvanced, setShowAdvanced,
    updateSection, toggleAdvancedSection, reorderSections,
    addItem, updateItem, removeItem,
  } = useCvData();

  const [activeSection, setActiveSection] = useState('personalInfo');
  const [showPreview, setShowPreview] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'form'>('list');

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl w-[95vw] h-[90vh] p-0 flex flex-col overflow-hidden">
          <DialogTitle className="sr-only">CV Maker</DialogTitle>
          
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
            <div className="flex items-center gap-2">
              {mobileView === 'form' && (
                <Button size="icon" variant="ghost" className="md:hidden" onClick={() => setMobileView('list')}>
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              )}
              <h2 className="font-bold text-lg">Mon CV</h2>
            </div>
            <Button size="sm" variant="outline" onClick={() => setShowPreview(true)}>
              <Eye className="w-4 h-4 mr-1" /> Prévisualiser
            </Button>
          </div>

          {/* Content: split layout */}
          <div className="flex-1 flex overflow-hidden min-h-0">
            {/* Left panel - sections */}
            <div className={`w-full md:w-64 md:border-r border-border overflow-y-auto p-3 shrink-0 ${mobileView === 'form' ? 'hidden md:block' : ''}`}>
              <SectionList
                sections={sections}
                activeSection={activeSection}
                onSelectSection={(id) => { setActiveSection(id); setMobileView('form'); }}
                onReorder={reorderSections}
                showAdvanced={showAdvanced}
                onToggleAdvanced={() => setShowAdvanced(!showAdvanced)}
                onToggleAdvancedSection={toggleAdvancedSection}
              />
            </div>

            {/* Right panel - form */}
            <div className={`flex-1 overflow-y-auto p-4 sm:p-6 ${mobileView === 'list' ? 'hidden md:block' : ''}`}>
              <SectionForm
                activeSection={activeSection}
                cvData={cvData}
                updateSection={updateSection}
                addItem={addItem}
                updateItem={updateItem}
                removeItem={removeItem}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview overlay */}
      {showPreview && (
        <CvPreview
          cvData={cvData}
          sections={sections}
          onClose={() => setShowPreview(false)}
        />
      )}
    </>
  );
};

export default CvBuilderModal;
