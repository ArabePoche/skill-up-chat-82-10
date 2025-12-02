/**
 * Modal de configuration d'une matière d'évaluation
 * Permet de modifier : date, heures, surveillants, remplacement
 */
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Clock, Users, Loader2 } from 'lucide-react';
import { SupervisorsSection } from './SupervisorsSection';
import { useUpdateSubjectConfig } from '../hooks/useSubjectConfig';
import { toast } from 'sonner';

interface SubjectConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evaluationId: string;
  subjectId: string;
  subjectName: string;
  classId: string;
  evaluationDate?: string | null;
  currentConfig?: {
    evaluation_date?: string;
    start_time?: string;
    end_time?: string;
    supervisors?: string[];
  };
}

export const SubjectConfigModal: React.FC<SubjectConfigModalProps> = ({
  open,
  onOpenChange,
  evaluationId,
  subjectId,
  subjectName,
  classId,
  evaluationDate,
  currentConfig,
}) => {
  const [date, setDate] = useState(currentConfig?.evaluation_date || '');
  const [startTime, setStartTime] = useState(currentConfig?.start_time || '');
  const [endTime, setEndTime] = useState(currentConfig?.end_time || '');
  const [supervisors, setSupervisors] = useState<string[]>(currentConfig?.supervisors || []);

  const updateMutation = useUpdateSubjectConfig();

  useEffect(() => {
    if (open) {
      setDate(currentConfig?.evaluation_date || '');
      setStartTime(currentConfig?.start_time || '');
      setEndTime(currentConfig?.end_time || '');
      setSupervisors(currentConfig?.supervisors || []);
    }
  }, [open, currentConfig]);

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        evaluationId,
        classId,
        subjectId,
        config: {
          evaluation_date: date || null,
          start_time: startTime || null,
          end_time: endTime || null,
        },
      });
      toast.success('Configuration mise à jour');
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating subject config:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Configurer : {subjectName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Date */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Date de l'épreuve
            </Label>
            <Input
              type="date"
              value={date}
              max={evaluationDate || undefined}
              onChange={(e) => setDate(e.target.value)}
            />
            {evaluationDate && (
              <p className="text-xs text-muted-foreground">
                Date max: {new Date(evaluationDate).toLocaleDateString('fr-FR')}
              </p>
            )}
          </div>

          {/* Heures */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Heure de début
              </Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Heure de fin
              </Label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          {/* Surveillants */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              Surveillants
            </Label>
            <SupervisorsSection
              selectedSupervisors={supervisors}
              onSupervisorsChange={setSupervisors}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
