/**
 * Onglet Génération de bulletins
 */
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { BookOpen, FileText, Download, Users, Printer } from 'lucide-react';

interface BulletinGenerationTabProps {
  availableClasses: Array<{
    id: string;
    name: string;
    cycle: string;
    current_students: number;
    max_students: number;
  }>;
  schoolId: string;
  schoolYearId: string;
}

export const BulletinGenerationTab: React.FC<BulletinGenerationTabProps> = ({ 
  availableClasses,
  schoolId,
  schoolYearId 
}) => {
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [selectAll, setSelectAll] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

  const selectedClass = availableClasses.find(c => c.id === selectedClassId);

  // TODO: Charger les périodes et élèves depuis la base
  const periods = [
    { id: '1', name: 'Trimestre 1' },
    { id: '2', name: 'Trimestre 2' },
    { id: '3', name: 'Trimestre 3' },
  ];

  const handleGenerateBulletins = () => {
    // TODO: Implémenter la génération des bulletins PDF
    console.log('Génération des bulletins pour:', {
      classId: selectedClassId,
      period: selectedPeriod,
      students: selectAll ? 'all' : selectedStudents,
    });
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Générer des Bulletins
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        <div className="space-y-6">
          {/* Sélection classe */}
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
                      <Badge variant="outline" className="ml-2">
                        {cls.current_students} élèves
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sélection période */}
          <div>
            <label className="text-sm font-medium mb-2 block">Période</label>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une période" />
              </SelectTrigger>
              <SelectContent>
                {periods.map((period) => (
                  <SelectItem key={period.id} value={period.id}>
                    {period.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sélection élèves */}
          {selectedClassId && (
            <div>
              <label className="text-sm font-medium mb-2 block">Élèves</label>
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Checkbox 
                    id="selectAll"
                    checked={selectAll}
                    onCheckedChange={(checked) => setSelectAll(checked as boolean)}
                  />
                  <label htmlFor="selectAll" className="text-sm font-medium cursor-pointer">
                    Sélectionner tous les élèves ({selectedClass?.current_students || 0})
                  </label>
                </div>
                
                {!selectAll && (
                  <div className="text-sm text-muted-foreground">
                    <Users className="h-4 w-4 inline mr-2" />
                    La liste des élèves sera chargée ici pour sélection individuelle
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button 
              onClick={handleGenerateBulletins}
              disabled={!selectedClassId || !selectedPeriod}
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              Générer PDF
            </Button>
            <Button 
              variant="outline"
              disabled={!selectedClassId || !selectedPeriod}
            >
              <Printer className="h-4 w-4 mr-2" />
              Imprimer
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
