/**
 * Composant de gestion des absences des enseignants
 */
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Calendar, FileText } from 'lucide-react';
import { useSchoolTeachers } from '@/school/hooks/useSchoolTeachers';
import { useTeacherAbsences, useCreateTeacherAbsence } from '../hooks/useTeacherAbsences';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface TeacherAbsencesProps {
  schoolId?: string;
}

export const TeacherAbsences: React.FC<TeacherAbsencesProps> = ({ schoolId }) => {
  const [open, setOpen] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [absenceDate, setAbsenceDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isJustified, setIsJustified] = useState(false);
  const [reason, setReason] = useState('');

  const { data: teachers, isLoading: loadingTeachers } = useSchoolTeachers(schoolId);
  const { data: absences, isLoading: loadingAbsences } = useTeacherAbsences(schoolId);
  const createAbsence = useCreateTeacherAbsence();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacherId || !absenceDate || !schoolId) return;

    await createAbsence.mutateAsync({
      school_id: schoolId,
      teacher_id: selectedTeacherId,
      absence_date: absenceDate,
      is_justified: isJustified,
      reason: reason || undefined,
    });

    setOpen(false);
    setSelectedTeacherId('');
    setAbsenceDate(format(new Date(), 'yyyy-MM-dd'));
    setIsJustified(false);
    setReason('');
  };

  if (loadingTeachers || loadingAbsences) {
    return <div className="p-6">Chargement...</div>;
  }

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Absences</h3>
          <p className="text-sm text-muted-foreground">
            Gérez les absences des enseignants
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle absence
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enregistrer une absence</DialogTitle>
              <DialogDescription>
                Déclarez une absence d'enseignant
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="teacher">Enseignant *</Label>
                <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un enseignant" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers?.map((teacher) => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        {teacher.profiles?.first_name} {teacher.profiles?.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Date d'absence *</Label>
                <Input
                  id="date"
                  type="date"
                  value={absenceDate}
                  onChange={(e) => setAbsenceDate(e.target.value)}
                  required
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="justified"
                  checked={isJustified}
                  onCheckedChange={(checked) => setIsJustified(checked as boolean)}
                />
                <Label htmlFor="justified" className="cursor-pointer">
                  Absence justifiée
                </Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Motif</Label>
                <Textarea
                  id="reason"
                  placeholder="Raison de l'absence..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={createAbsence.isPending}>
                  {createAbsence.isPending ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {absences?.map((absence) => (
          <Card key={absence.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">
                      {absence.school_teachers?.profiles?.first_name}{' '}
                      {absence.school_teachers?.profiles?.last_name}
                    </span>
                    <Badge variant={absence.is_justified ? 'default' : 'destructive'}>
                      {absence.is_justified ? 'Justifiée' : 'Non justifiée'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(absence.absence_date), 'dd MMM yyyy', { locale: fr })}
                  </div>
                  {absence.reason && (
                    <div className="flex items-start gap-1 text-sm">
                      <FileText className="w-4 h-4 mt-0.5 text-muted-foreground" />
                      <span className="text-muted-foreground">{absence.reason}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {absences?.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Aucune absence enregistrée
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
