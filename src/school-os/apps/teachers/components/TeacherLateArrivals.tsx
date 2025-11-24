/**
 * Composant de gestion des retards des enseignants
 */
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Plus, Calendar, Clock, FileText } from 'lucide-react';
import { useSchoolTeachers } from '@/school/hooks/useSchoolTeachers';
import { useTeacherLateArrivals, useCreateTeacherLateArrival } from '../hooks/useTeacherLateArrivals';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface TeacherLateArrivalsProps {
  schoolId?: string;
}

export const TeacherLateArrivals: React.FC<TeacherLateArrivalsProps> = ({ schoolId }) => {
  const [open, setOpen] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [lateDate, setLateDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [minutes, setMinutes] = useState('');
  const [reason, setReason] = useState('');

  const { data: teachers, isLoading: loadingTeachers } = useSchoolTeachers(schoolId);
  const { data: lateArrivals, isLoading: loadingLateArrivals } = useTeacherLateArrivals(schoolId);
  const createLateArrival = useCreateTeacherLateArrival();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacherId || !lateDate || !minutes || !schoolId) return;

    await createLateArrival.mutateAsync({
      school_id: schoolId,
      teacher_id: selectedTeacherId,
      late_date: lateDate,
      minutes_late: parseInt(minutes),
      reason: reason || undefined,
    });

    setOpen(false);
    setSelectedTeacherId('');
    setLateDate(format(new Date(), 'yyyy-MM-dd'));
    setMinutes('');
    setReason('');
  };

  if (loadingTeachers || loadingLateArrivals) {
    return <div className="p-6">Chargement...</div>;
  }

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Retards</h3>
          <p className="text-sm text-muted-foreground">
            Gérez les retards des enseignants
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nouveau retard
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enregistrer un retard</DialogTitle>
              <DialogDescription>
                Déclarez un retard d'enseignant
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
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={lateDate}
                  onChange={(e) => setLateDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="minutes">Durée du retard (minutes) *</Label>
                <Input
                  id="minutes"
                  type="number"
                  min="1"
                  placeholder="Ex: 15"
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Motif</Label>
                <Textarea
                  id="reason"
                  placeholder="Raison du retard..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={createLateArrival.isPending}>
                  {createLateArrival.isPending ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {lateArrivals?.map((late) => (
          <Card key={late.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">
                      {late.school_teachers?.profiles?.first_name}{' '}
                      {late.school_teachers?.profiles?.last_name}
                    </span>
                    <span className="text-sm font-medium text-orange-600">
                      {late.minutes_late} min
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(late.late_date), 'dd MMM yyyy', { locale: fr })}
                  </div>
                  {late.reason && (
                    <div className="flex items-start gap-1 text-sm">
                      <FileText className="w-4 h-4 mt-0.5 text-muted-foreground" />
                      <span className="text-muted-foreground">{late.reason}</span>
                    </div>
                  )}
                </div>
                <Clock className="w-5 h-5 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        ))}
        {lateArrivals?.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Aucun retard enregistré
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
