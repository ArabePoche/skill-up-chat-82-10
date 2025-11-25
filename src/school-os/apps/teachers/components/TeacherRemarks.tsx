/**
 * Composant de gestion des remarques sur les enseignants
 */
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { Plus, Calendar, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { useSchoolTeachers } from '@/school/hooks/useSchoolTeachers';
import { useTeacherRemarks, useCreateTeacherRemark } from '../hooks/useTeacherRemarks';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface TeacherRemarksProps {
  schoolId?: string;
}

export const TeacherRemarks: React.FC<TeacherRemarksProps> = ({ schoolId }) => {
  const [open, setOpen] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [remarkType, setRemarkType] = useState<'positive' | 'negative' | 'neutral'>('neutral');
  const [content, setContent] = useState('');

  const { data: teachers, isLoading: loadingTeachers } = useSchoolTeachers(schoolId);
  const { data: remarks, isLoading: loadingRemarks } = useTeacherRemarks(schoolId);
  const createRemark = useCreateTeacherRemark();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacherId || !content || !schoolId) return;

    await createRemark.mutateAsync({
      school_id: schoolId,
      teacher_id: selectedTeacherId,
      remark_type: remarkType,
      content: content,
    });

    setOpen(false);
    setSelectedTeacherId('');
    setRemarkType('neutral');
    setContent('');
  };

  const getRemarkTypeIcon = (type: string) => {
    switch (type) {
      case 'positive':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'negative':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Info className="w-4 h-4 text-blue-600" />;
    }
  };

  const getRemarkTypeLabel = (type: string) => {
    const labels = {
      positive: 'Positive',
      negative: 'Négative',
      neutral: 'Neutre',
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getRemarkTypeColor = (type: string) => {
    const colors = {
      positive: 'bg-green-100 text-green-800',
      negative: 'bg-red-100 text-red-800',
      neutral: 'bg-blue-100 text-blue-800',
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (loadingTeachers || loadingRemarks) {
    return <div className="p-6">Chargement...</div>;
  }

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Remarques</h3>
          <p className="text-sm text-muted-foreground">
            Gérez les remarques et observations
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle remarque
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter une remarque</DialogTitle>
              <DialogDescription>
                Enregistrez une observation concernant un enseignant
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
                <Label htmlFor="type">Type de remarque *</Label>
                <Select value={remarkType} onValueChange={(v) => setRemarkType(v as any)} required>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="positive">Positive</SelectItem>
                    <SelectItem value="neutral">Neutre</SelectItem>
                    <SelectItem value="negative">Négative</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Contenu *</Label>
                <Textarea
                  id="content"
                  placeholder="Décrivez la remarque..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={4}
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={createRemark.isPending}>
                  {createRemark.isPending ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {remarks?.map((remark) => (
          <Card key={remark.id}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                {getRemarkTypeIcon(remark.remark_type)}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">
                      {remark.school_teachers?.first_name}{' '}
                      {remark.school_teachers?.last_name}
                    </span>
                    <Badge className={getRemarkTypeColor(remark.remark_type)}>
                      {getRemarkTypeLabel(remark.remark_type)}
                    </Badge>
                  </div>
                  <p className="text-sm">{remark.content}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(remark.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {remarks?.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Aucune remarque enregistrée
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
