/**
 * Modal principal du CV Builder
 * Layout : panneau gauche (sections drag & drop) + panneau droit (formulaire)
 * Sur mobile : navigation par onglets
 * Sauvegarde le CV dans Supabase pour consultation publique
 */
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Eye, ArrowLeft, Save, Loader2, Share2 } from 'lucide-react';
import { useCvData } from './hooks/useCvData';
import { useSaveCv } from './hooks/useSaveCv';
import SectionList from './components/SectionList';
import SectionForm from './components/SectionForm';
import CvPreview from './components/CvPreview';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CvBuilderModal: React.FC<Props> = ({ open, onOpenChange }) => {
  const {
    cvData, sections, showAdvanced, setShowAdvanced,
    updateSection, toggleAdvancedSection, reorderSections,
    addItem, updateItem, removeItem, setCvData,
  } = useCvData();

  const [userId, setUserId] = useState<string>();
  const { savedCvId, isSaving, isLoading, loadExistingCv, saveCv } = useSaveCv(userId);
  const [activeSection, setActiveSection] = useState('personalInfo');
  const [showPreview, setShowPreview] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'form'>('list');
  const [loaded, setLoaded] = useState(false);
  const { toast } = useToast();

  // Récupérer l'utilisateur connecté
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  // Charger le CV existant à l'ouverture
  useEffect(() => {
    if (open && userId && !loaded) {
      loadExistingCv().then(existingData => {
        if (existingData) {
          setCvData(existingData);
        }
        setLoaded(true);
      });
    }
    if (!open) setLoaded(false);
  }, [open, userId, loaded, loadExistingCv, setCvData]);

  const handleSave = () => saveCv(cvData);

  const handleShareLink = () => {
    if (savedCvId) {
      const url = `${window.location.origin}/cv/${savedCvId}`;
      navigator.clipboard.writeText(url);
      toast({ title: "Lien copié !", description: "Le lien de votre CV a été copié dans le presse-papier." });
    }
  };

  return (
    <>
      <Dialog open={open && !showPreview} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl w-[95vw] h-[90vh] p-0 flex flex-col overflow-hidden">
          <DialogTitle className="sr-only">CV Maker pro</DialogTitle>
          
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
            <div className="flex items-center gap-2">
              {savedCvId && (
                <Button size="sm" variant="ghost" onClick={handleShareLink}>
                  <Share2 className="w-4 h-4 mr-1" /> Partager
                </Button>
              )}
              <Button size="sm" variant="actionBlue" onClick={handleSave} disabled={isSaving} className="rounded-full px-5 font-semibold text-base shadow-lg hover:scale-105 transition-transform">
                {isSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                Sauvegarder
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowPreview(true)}>
                <Eye className="w-4 h-4 mr-1" /> Prévisualiser
              </Button>
            </div>
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
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <SectionForm
                  activeSection={activeSection}
                  cvData={cvData}
                  updateSection={updateSection}
                  addItem={addItem}
                  updateItem={updateItem}
                  removeItem={removeItem}
                />
              )}
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
