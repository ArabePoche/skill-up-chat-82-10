/**
 * Section principale de génération des cartes scolaires
 * Permet de sélectionner une classe, prévisualiser et exporter en PDF ou image
 */
import React, { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, FileImage, FileText, CreditCard, Loader2, BookOpen } from 'lucide-react';
import { SchoolCardPreview } from './SchoolCardPreview';
import { useClassStudentsForCards, SchoolCardStudent } from './useSchoolCardData';
import { toast } from 'sonner';

interface SchoolCardsSectionProps {
  availableClasses: Array<{
    id: string;
    name: string;
    cycle: string;
    current_students: number;
    max_students: number;
  }>;
  schoolName: string;
  schoolYearLabel: string;
  schoolLogoUrl?: string;
}

export const SchoolCardsSection: React.FC<SchoolCardsSectionProps> = ({
  availableClasses,
  schoolName,
  schoolYearLabel,
  schoolLogoUrl,
}) => {
  const [selectedClassId, setSelectedClassId] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const cardsContainerRef = useRef<HTMLDivElement>(null);

  const { data: students = [], isLoading } = useClassStudentsForCards(selectedClassId || undefined);
  const selectedClass = availableClasses.find(c => c.id === selectedClassId);

  const renderCardToCanvas = useCallback(async (student: SchoolCardStudent): Promise<HTMLCanvasElement> => {
    const html2canvas = (await import('html2canvas')).default;

    // Créer un conteneur temporaire hors écran
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    document.body.appendChild(container);

    // Render React component into container
    const { createRoot } = await import('react-dom/client');
    const root = createRoot(container);

    return new Promise((resolve) => {
      root.render(
        <SchoolCardPreview
          student={student}
          schoolName={schoolName}
          schoolYearLabel={schoolYearLabel}
          schoolLogoUrl={schoolLogoUrl}
        />
      );

      setTimeout(async () => {
        const cardEl = container.querySelector('.school-card-render') as HTMLElement;
        if (!cardEl) {
          root.unmount();
          container.remove();
          throw new Error('Card element not found');
        }

        const canvas = await html2canvas(cardEl, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
        });

        root.unmount();
        container.remove();
        resolve(canvas);
      }, 300);
    });
  }, [schoolName, schoolYearLabel, schoolLogoUrl]);

  const handleExportSingleImage = useCallback(async (student: SchoolCardStudent) => {
    try {
      setIsExporting(true);
      const canvas = await renderCardToCanvas(student);
      const link = document.createElement('a');
      link.download = `carte_${student.last_name}_${student.first_name}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('Carte téléchargée');
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de l\'export');
    } finally {
      setIsExporting(false);
    }
  }, [renderCardToCanvas]);

  const handleExportClassPDF = useCallback(async () => {
    if (students.length === 0) return;

    try {
      setIsExporting(true);
      toast.loading('Génération du PDF en cours...', { id: 'pdf-gen' });

      const { jsPDF } = await import('jspdf');
      // A4 landscape, cards 2 per row, 3 per col = 6 per page
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = 210;
      const pageH = 297;
      const cardW = 86; // mm
      const cardH = 54; // mm (format carte)
      const marginX = (pageW - cardW * 2 - 10) / 2;
      const marginY = 15;
      const gapX = 10;
      const gapY = 8;
      const cols = 2;
      const rows = 4;
      const cardsPerPage = cols * rows;

      for (let i = 0; i < students.length; i++) {
        if (i > 0 && i % cardsPerPage === 0) {
          pdf.addPage();
        }

        const posOnPage = i % cardsPerPage;
        const col = posOnPage % cols;
        const row = Math.floor(posOnPage / cols);
        const x = marginX + col * (cardW + gapX);
        const y = marginY + row * (cardH + gapY);

        const canvas = await renderCardToCanvas(students[i]);
        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', x, y, cardW, cardH);
      }

      pdf.save(`cartes_scolaires_${selectedClass?.name || 'classe'}.pdf`);
      toast.success('PDF généré avec succès', { id: 'pdf-gen' });
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de la génération du PDF', { id: 'pdf-gen' });
    } finally {
      setIsExporting(false);
    }
  }, [students, selectedClass, renderCardToCanvas]);

  return (
    <div className="space-y-4">
      {/* Sélection de classe */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="w-5 h-5" />
            Cartes scolaires
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Classe</label>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une classe" />
                </SelectTrigger>
                <SelectContent>
                  {availableClasses.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        {cls.name}
                        <Badge variant="outline" className="ml-1">{cls.current_students} élèves</Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedClassId && students.length > 0 && (
              <div className="flex items-end">
                <Button
                  onClick={handleExportClassPDF}
                  disabled={isExporting}
                  className="w-full sm:w-auto"
                >
                  {isExporting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4 mr-2" />
                  )}
                  Exporter toute la classe (PDF)
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* État de chargement */}
      {isLoading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Pas de classe sélectionnée */}
      {!selectedClassId && (
        <Card className="flex items-center justify-center py-12">
          <div className="text-center">
            <CreditCard className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Sélectionnez une classe pour générer les cartes scolaires</p>
          </div>
        </Card>
      )}

      {/* Grille des cartes */}
      {selectedClassId && !isLoading && students.length > 0 && (
        <ScrollArea className="h-[60vh]">
          <div ref={cardsContainerRef} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-1">
            {students.map((student) => (
              <div key={student.id} className="space-y-2">
                <SchoolCardPreview
                  student={student}
                  schoolName={schoolName}
                  schoolYearLabel={schoolYearLabel}
                  schoolLogoUrl={schoolLogoUrl}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => handleExportSingleImage(student)}
                  disabled={isExporting}
                >
                  <FileImage className="h-3 w-3 mr-1" />
                  Télécharger (PNG)
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Aucun élève */}
      {selectedClassId && !isLoading && students.length === 0 && (
        <Card className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">Aucun élève dans cette classe</p>
        </Card>
      )}
    </div>
  );
};
