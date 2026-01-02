// Application de gestion de l'emploi du temps
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Calendar, Clock, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ScheduleItem {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  subject: string;
  teacher: string;
  room: string;
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const HOURS = Array.from({ length: 14 }, (_, i) => `${(i + 7).toString().padStart(2, '0')}:00`);

export const ScheduleApp: React.FC = () => {
  const { t } = useTranslation();
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);
  const [formData, setFormData] = useState({
    day: '',
    startTime: '',
    endTime: '',
    subject: '',
    teacher: '',
    room: '',
  });

  const handleSubmit = () => {
    if (!formData.day || !formData.startTime || !formData.endTime || !formData.subject) return;

    if (editingItem) {
      setScheduleItems(items =>
        items.map(item =>
          item.id === editingItem.id ? { ...formData, id: item.id } : item
        )
      );
    } else {
      setScheduleItems(items => [
        ...items,
        { ...formData, id: crypto.randomUUID() },
      ]);
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({
      day: '',
      startTime: '',
      endTime: '',
      subject: '',
      teacher: '',
      room: '',
    });
    setEditingItem(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (item: ScheduleItem) => {
    setEditingItem(item);
    setFormData(item);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setScheduleItems(items => items.filter(item => item.id !== id));
  };

  const getItemsForDay = (day: string) => {
    return scheduleItems
      .filter(item => item.day === day)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  return (
    <div className="p-6 h-full overflow-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{t('schoolOS.schedule.title')}</h2>
          <p className="text-muted-foreground mt-1">
            {t('schoolOS.schedule.addClass', 'Gérez les emplois du temps')}
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              {t('schoolOS.schedule.addClass', 'Ajouter une séance')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingItem 
                  ? t('schoolOS.schedule.editClass', 'Modifier la séance')
                  : t('schoolOS.schedule.addClass', 'Ajouter une séance')
                }
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>{t('schoolOS.schedule.day', 'Jour')}</Label>
                <Select value={formData.day} onValueChange={(value) => setFormData({ ...formData, day: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('schoolOS.schedule.selectDay', 'Sélectionner un jour')} />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map(day => (
                      <SelectItem key={day} value={day}>
                        {t(`schoolOS.schedule.${day}`, day)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>{t('schoolOS.schedule.startTime', 'Heure de début')}</Label>
                  <Select value={formData.startTime} onValueChange={(value) => setFormData({ ...formData, startTime: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="08:00" />
                    </SelectTrigger>
                    <SelectContent>
                      {HOURS.map(hour => (
                        <SelectItem key={hour} value={hour}>{hour}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>{t('schoolOS.schedule.endTime', 'Heure de fin')}</Label>
                  <Select value={formData.endTime} onValueChange={(value) => setFormData({ ...formData, endTime: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="09:00" />
                    </SelectTrigger>
                    <SelectContent>
                      {HOURS.map(hour => (
                        <SelectItem key={hour} value={hour}>{hour}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label>{t('schoolOS.schedule.subject', 'Matière')}</Label>
                <Input
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder={t('schoolOS.schedule.subjectPlaceholder', 'Mathématiques')}
                />
              </div>

              <div className="grid gap-2">
                <Label>{t('schoolOS.schedule.teacher', 'Enseignant')}</Label>
                <Input
                  value={formData.teacher}
                  onChange={(e) => setFormData({ ...formData, teacher: e.target.value })}
                  placeholder={t('schoolOS.schedule.teacherPlaceholder', 'M. Dupont')}
                />
              </div>

              <div className="grid gap-2">
                <Label>{t('schoolOS.schedule.room', 'Salle')}</Label>
                <Input
                  value={formData.room}
                  onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                  placeholder={t('schoolOS.schedule.roomPlaceholder', 'Salle 101')}
                />
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={resetForm}>
                  {t('common.cancel', 'Annuler')}
                </Button>
                <Button onClick={handleSubmit}>
                  {editingItem ? t('common.save', 'Enregistrer') : t('common.add', 'Ajouter')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Grille de l'emploi du temps */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {DAYS.map(day => (
          <Card key={day} className="bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {t(`schoolOS.schedule.${day}`, day)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {getItemsForDay(day).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t('schoolOS.schedule.noSchedule', 'Aucune séance')}
                </p>
              ) : (
                getItemsForDay(day).map(item => (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg bg-primary/10 border border-primary/20"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{item.subject}</p>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                          <Clock className="w-3 h-3" />
                          {item.startTime} - {item.endTime}
                        </div>
                        {item.teacher && (
                          <p className="text-sm text-muted-foreground">{item.teacher}</p>
                        )}
                        {item.room && (
                          <p className="text-sm text-muted-foreground">{item.room}</p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleEdit(item)}
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
