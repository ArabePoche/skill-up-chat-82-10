// Modal pour prendre une décision concernant un élève
// (Promotion, Rétrogradation, Transfert, Exclusion avec archivage)
import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, TrendingUp, TrendingDown, ArrowRightLeft, UserX, AlertTriangle, School, Search, Archive } from 'lucide-react';
import { useSchoolClasses } from '@/school/hooks/useClasses';
import { useSchoolYear } from '@/school/context/SchoolYearContext';
import { useAuth } from '@/hooks/useAuth';
import { useApplyStudentDecision, useAllSchools, type DecisionType } from '../hooks/useStudentDecision';
import { useArchiveStudent, type ArchiveReason } from '../hooks/useArchivedStudents';

interface StudentDecisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: any;
}

export const StudentDecisionModal: React.FC<StudentDecisionModalProps> = ({
  isOpen,
  onClose,
  student,
}) => {
  const { user } = useAuth();
  const { school, activeSchoolYear } = useSchoolYear();
  const { data: classes = [] } = useSchoolClasses(school?.id, activeSchoolYear?.id);
  const { data: allSchools = [] } = useAllSchools();
  const applyDecision = useApplyStudentDecision();
  const archiveStudent = useArchiveStudent();

  const [decisionType, setDecisionType] = useState<DecisionType | ''>('');
  const [targetClassId, setTargetClassId] = useState<string>('');
  const [targetSchoolId, setTargetSchoolId] = useState<string>('');
  const [manualSchoolName, setManualSchoolName] = useState('');
  const [useManualSchool, setUseManualSchool] = useState(false);
  const [comment, setComment] = useState('');
  const [schoolSearch, setSchoolSearch] = useState('');

  // Filtrer les classes pour promotion/rétrogradation
  const currentClassIndex = classes.findIndex((c: any) => c.id === student?.class_id);
  
  const availableClasses = useMemo(() => {
    if (!decisionType || (decisionType !== 'promotion' && decisionType !== 'demotion')) {
      return classes;
    }
    // Retourner toutes les classes sauf celle actuelle
    return classes.filter((c: any) => c.id !== student?.class_id);
  }, [classes, decisionType, student?.class_id]);

  // Filtrer les écoles
  const filteredSchools = useMemo(() => {
    if (!schoolSearch.trim()) return allSchools;
    const search = schoolSearch.toLowerCase();
    return allSchools.filter((s: any) => 
      s.name?.toLowerCase().includes(search) ||
      s.city?.toLowerCase().includes(search)
    );
  }, [allSchools, schoolSearch]);

  const handleSubmit = async () => {
    if (!decisionType || !user?.id) return;

    // Validation
    if ((decisionType === 'promotion' || decisionType === 'demotion') && !targetClassId) {
      return;
    }

    if (decisionType === 'transfer' && !targetSchoolId && !manualSchoolName) {
      return;
    }

    // Pour exclusion et transfert, on archive l'élève au lieu de juste changer le statut
    if (decisionType === 'exclusion' || decisionType === 'transfer') {
      const archiveReason: ArchiveReason = decisionType === 'exclusion' ? 'exclusion' : 'transfer';
      
      await archiveStudent.mutateAsync({
        student,
        archive_reason: archiveReason,
        archive_comment: comment || undefined,
        target_school_id: useManualSchool ? null : targetSchoolId || null,
        target_school_name: useManualSchool ? manualSchoolName : (
          targetSchoolId ? allSchools.find((s: any) => s.id === targetSchoolId)?.name : null
        ),
           source_school_name: school?.name || null,
        archived_by: user.id,
      });
    } else {
      // Pour promotion/rétrogradation, on garde le comportement existant
      await applyDecision.mutateAsync({
        student_id: student.id,
        decision_type: decisionType,
        target_class_id: targetClassId || null,
        target_school_id: null,
        target_school_name: null,
        comment: comment || null,
        decided_by: user.id,
      });
    }

    handleClose();
  };

  const handleClose = () => {
    setDecisionType('');
    setTargetClassId('');
    setTargetSchoolId('');
    setManualSchoolName('');
    setUseManualSchool(false);
    setComment('');
    setSchoolSearch('');
    onClose();
  };

  const getDecisionIcon = (type: DecisionType) => {
    switch (type) {
      case 'promotion':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'demotion':
        return <TrendingDown className="w-4 h-4 text-orange-600" />;
      case 'transfer':
        return <ArrowRightLeft className="w-4 h-4 text-blue-600" />;
      case 'exclusion':
        return <UserX className="w-4 h-4 text-red-600" />;
    }
  };

  const isFormValid = () => {
    if (!decisionType) return false;
    
    if (decisionType === 'promotion' || decisionType === 'demotion') {
      return !!targetClassId;
    }
    
    if (decisionType === 'transfer') {
      return useManualSchool ? !!manualSchoolName.trim() : !!targetSchoolId;
    }
    
    return true; // Exclusion ne nécessite pas de champs supplémentaires
  };

  const isPending = applyDecision.isPending || archiveStudent.isPending;

  if (!student) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Décision concernant l'élève</DialogTitle>
          <DialogDescription>
            Sélectionnez le type de décision à appliquer
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 py-4">
            {/* Info élève */}
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Avatar className="w-12 h-12">
                <AvatarImage src={student.photo_url} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {student.first_name?.[0]}{student.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-semibold">{student.first_name} {student.last_name}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {student.classes?.name && (
                    <Badge variant="outline">{student.classes.name}</Badge>
                  )}
                  <span>{student.student_code}</span>
                </div>
              </div>
            </div>

            {/* Type de décision */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Type de décision</Label>
              <RadioGroup
                value={decisionType}
                onValueChange={(value) => {
                  setDecisionType(value as DecisionType);
                  setTargetClassId('');
                  setTargetSchoolId('');
                }}
                className="grid grid-cols-1 gap-3"
              >
                <label
                  htmlFor="promotion"
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    decisionType === 'promotion' ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : 'hover:bg-muted/50'
                  }`}
                >
                  <RadioGroupItem value="promotion" id="promotion" />
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <div className="flex-1">
                    <p className="font-medium">Promotion</p>
                    <p className="text-xs text-muted-foreground">Passer l'élève à une classe supérieure</p>
                  </div>
                </label>

                <label
                  htmlFor="demotion"
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    decisionType === 'demotion' ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/20' : 'hover:bg-muted/50'
                  }`}
                >
                  <RadioGroupItem value="demotion" id="demotion" />
                  <TrendingDown className="w-5 h-5 text-orange-600" />
                  <div className="flex-1">
                    <p className="font-medium">Rétrogradation</p>
                    <p className="text-xs text-muted-foreground">Faire redoubler l'élève dans une classe inférieure</p>
                  </div>
                </label>

                <label
                  htmlFor="transfer"
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    decisionType === 'transfer' ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' : 'hover:bg-muted/50'
                  }`}
                >
                  <RadioGroupItem value="transfer" id="transfer" />
                  <ArrowRightLeft className="w-5 h-5 text-blue-600" />
                  <div className="flex-1">
                    <p className="font-medium">Transfert</p>
                    <p className="text-xs text-muted-foreground">Transférer et archiver l'élève (restaurable)</p>
                  </div>
                </label>

                <label
                  htmlFor="exclusion"
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    decisionType === 'exclusion' ? 'border-red-500 bg-red-50 dark:bg-red-950/20' : 'hover:bg-muted/50'
                  }`}
                >
                  <RadioGroupItem value="exclusion" id="exclusion" />
                  <UserX className="w-5 h-5 text-red-600" />
                  <div className="flex-1">
                    <p className="font-medium">Exclusion</p>
                    <p className="text-xs text-muted-foreground">Exclure et archiver l'élève (restaurable)</p>
                  </div>
                </label>
              </RadioGroup>
            </div>

            {/* Sélection de classe pour promotion/rétrogradation */}
            {(decisionType === 'promotion' || decisionType === 'demotion') && (
              <div className="space-y-2">
                <Label>Classe cible *</Label>
                <Select value={targetClassId} onValueChange={setTargetClassId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une classe" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableClasses.map((cls: any) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name} {cls.cycle && `(${cls.cycle})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Sélection d'école pour transfert */}
            {decisionType === 'transfer' && (
              <div className="space-y-3">
                <Label>École de destination *</Label>
                
                {!useManualSchool ? (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Rechercher une école..."
                        value={schoolSearch}
                        onChange={(e) => setSchoolSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    
                    <Select value={targetSchoolId} onValueChange={setTargetSchoolId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une école" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredSchools.map((sch: any) => (
                          <SelectItem key={sch.id} value={sch.id}>
                            <div className="flex items-center gap-2">
                              <School className="w-4 h-4" />
                              <span>{sch.name}</span>
                              {sch.city && (
                                <span className="text-xs text-muted-foreground">({sch.city})</span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => setUseManualSchool(true)}
                    >
                      L'école n'est pas dans la liste ? Saisir manuellement
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Input
                      placeholder="Nom de l'école"
                      value={manualSchoolName}
                      onChange={(e) => setManualSchoolName(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => {
                        setUseManualSchool(false);
                        setManualSchoolName('');
                      }}
                    >
                      Revenir à la liste des écoles
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Info archivage pour exclusion/transfert */}
            {(decisionType === 'exclusion' || decisionType === 'transfer') && (
              <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
                <Archive className="w-4 h-4 text-amber-600" />
                <AlertDescription className="text-amber-800 dark:text-amber-200">
                  L'élève sera archivé et pourra être restauré ultérieurement depuis l'onglet "Archives".
                  Toutes ses données académiques et administratives seront conservées.
                </AlertDescription>
              </Alert>
            )}

            {/* Commentaire */}
            {decisionType && (
              <div className="space-y-2">
                <Label>Commentaire / Justificatif</Label>
                <Textarea
                  placeholder="Ajouter un commentaire ou une justification..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                />
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isFormValid() || isPending}
            variant={decisionType === 'exclusion' ? 'destructive' : 'default'}
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Application...
              </>
            ) : (
              <>
                {decisionType && getDecisionIcon(decisionType)}
                <span className="ml-2">Appliquer la décision</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
