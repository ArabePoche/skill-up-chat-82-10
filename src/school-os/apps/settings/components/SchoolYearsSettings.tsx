/**
 * Composant pour gérer les années scolaires
 */
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useSchoolYears, useCreateSchoolYear, useUpdateSchoolYear, useDeleteSchoolYear } from '@/school/hooks/useSchool';
import { useCopySchoolYearData } from '@/school/hooks/useSchoolYearCopy';
import { useSchoolClasses } from '@/school/hooks/useClasses';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface SchoolYearsSettingsProps {
  schoolId: string;
}

// Composant pour sélectionner les classes
const ClassSelector: React.FC<{
  schoolId: string;
  yearId: string;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}> = ({ schoolId, yearId, selectedIds, onSelectionChange }) => {
  const { data: classes } = useSchoolClasses(schoolId, yearId);

  const handleToggle = (classId: string) => {
    if (selectedIds.includes(classId)) {
      onSelectionChange(selectedIds.filter(id => id !== classId));
    } else {
      onSelectionChange([...selectedIds, classId]);
    }
  };

  const handleToggleAll = () => {
    if (selectedIds.length === classes?.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(classes?.map(c => c.id) || []);
    }
  };

  if (!classes || classes.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucune classe disponible</p>;
  }

  return (
    <div className="space-y-2 max-h-40 overflow-y-auto border rounded p-2">
      <div className="flex items-center space-x-2 pb-2 border-b">
        <Checkbox
          id="select_all_classes"
          checked={selectedIds.length === classes.length}
          onCheckedChange={handleToggleAll}
        />
        <Label htmlFor="select_all_classes" className="text-sm font-medium">
          Tout sélectionner
        </Label>
      </div>
      {classes.map((cls) => (
        <div key={cls.id} className="flex items-center space-x-2">
          <Checkbox
            id={`class_${cls.id}`}
            checked={selectedIds.includes(cls.id)}
            onCheckedChange={() => handleToggle(cls.id)}
          />
          <Label htmlFor={`class_${cls.id}`} className="text-sm">
            {cls.name}
          </Label>
        </div>
      ))}
    </div>
  );
};

// Composant pour sélectionner les matières
const SubjectSelector: React.FC<{
  schoolId: string;
  yearId: string;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}> = ({ schoolId, yearId, selectedIds, onSelectionChange }) => {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    const fetchSubjects = async () => {
      setLoading(true);
      const { data: classes } = await supabase
        .from('classes')
        .select('id')
        .eq('school_id', schoolId)
        .eq('school_year_id', yearId);
      
      if (classes && classes.length > 0) {
        const classIds = classes.map((c: any) => c.id);
        const { data: classSubjects } = await supabase
          .from('class_subjects')
          .select('subject_id')
          .in('class_id', classIds);
        
        if (classSubjects && classSubjects.length > 0) {
          const subjectIds = [...new Set(classSubjects.map((cs: any) => cs.subject_id))];
          const { data: subjectsData } = await supabase
            .from('subjects')
            .select('*')
            .in('id', subjectIds);
          setSubjects(subjectsData || []);
        }
      }
      setLoading(false);
    };

    if (schoolId && yearId) {
      fetchSubjects();
    }
  }, [schoolId, yearId]);

  const handleToggle = (subjectId: string) => {
    if (selectedIds.includes(subjectId)) {
      onSelectionChange(selectedIds.filter(id => id !== subjectId));
    } else {
      onSelectionChange([...selectedIds, subjectId]);
    }
  };

  const handleToggleAll = () => {
    if (selectedIds.length === subjects.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(subjects.map(s => s.id));
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Chargement...</p>;
  }

  if (subjects.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucune matière disponible</p>;
  }

  return (
    <div className="space-y-2 max-h-40 overflow-y-auto border rounded p-2">
      <div className="flex items-center space-x-2 pb-2 border-b">
        <Checkbox
          id="select_all_subjects"
          checked={selectedIds.length === subjects.length}
          onCheckedChange={handleToggleAll}
        />
        <Label htmlFor="select_all_subjects" className="text-sm font-medium">
          Tout sélectionner
        </Label>
      </div>
      {subjects.map((subject) => (
        <div key={subject.id} className="flex items-center space-x-2">
          <Checkbox
            id={`subject_${subject.id}`}
            checked={selectedIds.includes(subject.id)}
            onCheckedChange={() => handleToggle(subject.id)}
          />
          <Label htmlFor={`subject_${subject.id}`} className="text-sm">
            {subject.name}
          </Label>
        </div>
      ))}
    </div>
  );
};

export const SchoolYearsSettings: React.FC<SchoolYearsSettingsProps> = ({ schoolId }) => {
  const { data: schoolYears, isLoading } = useSchoolYears(schoolId);
  const createSchoolYear = useCreateSchoolYear();
  const updateSchoolYear = useUpdateSchoolYear();
  const deleteSchoolYear = useDeleteSchoolYear();
  const copySchoolYearData = useCopySchoolYearData();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [deleteYearId, setDeleteYearId] = useState<string | null>(null);
  const [editingYearId, setEditingYearId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    year_label: '',
    start_date: '',
    end_date: '',
  });
  const [copyOptions, setCopyOptions] = useState({
    enabled: false,
    sourceYearId: '',
    copyClasses: true,
    copySubjects: true,
  });
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await createSchoolYear.mutateAsync({
      school_id: schoolId,
      ...formData,
    });
    
    // Si la copie est activée, copier les données
    if (copyOptions.enabled && copyOptions.sourceYearId && result?.id) {
      await copySchoolYearData.mutateAsync({
        schoolId,
        sourceYearId: copyOptions.sourceYearId,
        targetYearId: result.id,
        copyClasses: copyOptions.copyClasses,
        copySubjects: copyOptions.copySubjects,
        selectedClassIds: copyOptions.copyClasses ? selectedClassIds : undefined,
        selectedSubjectIds: copyOptions.copySubjects ? selectedSubjectIds : undefined,
      });
    }
    
    setShowCreateDialog(false);
    setFormData({ year_label: '', start_date: '', end_date: '' });
    setCopyOptions({ enabled: false, sourceYearId: '', copyClasses: true, copySubjects: true });
    setSelectedClassIds([]);
    setSelectedSubjectIds([]);
  };

  const handleSetActive = async (yearId: string) => {
    // Désactiver toutes les autres années
    if (schoolYears) {
      for (const year of schoolYears) {
        if (year.id !== yearId && year.is_active) {
          await updateSchoolYear.mutateAsync({
            id: year.id,
            school_id: schoolId,
            is_active: false,
          });
        }
      }
    }
    // Activer l'année sélectionnée
    await updateSchoolYear.mutateAsync({
      id: yearId,
      school_id: schoolId,
      is_active: true,
    });
  };

  const handleDelete = async () => {
    if (deleteYearId) {
      await deleteSchoolYear.mutateAsync({
        id: deleteYearId,
        school_id: schoolId,
      });
      setDeleteYearId(null);
    }
  };

  const handleEdit = (year: any) => {
    setEditingYearId(year.id);
    setFormData({
      year_label: year.year_label,
      start_date: year.start_date,
      end_date: year.end_date,
    });
    setShowEditDialog(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingYearId) {
      await updateSchoolYear.mutateAsync({
        id: editingYearId,
        school_id: schoolId,
        ...formData,
      });
      setShowEditDialog(false);
      setEditingYearId(null);
      setFormData({ year_label: '', start_date: '', end_date: '' });
    }
  };

  if (isLoading) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                <CardTitle>Années scolaires</CardTitle>
              </div>
              <CardDescription className="mt-2">
                Gérez les années scolaires de votre établissement
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle année
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {schoolYears && schoolYears.length > 0 ? (
            <div className="space-y-3">
              {schoolYears.map((year) => (
                <div
                  key={year.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{year.year_label}</h3>
                      {year.is_active && (
                        <Badge variant="default" className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Active
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Du {format(new Date(year.start_date), 'dd MMMM yyyy', { locale: fr })} au{' '}
                      {format(new Date(year.end_date), 'dd MMMM yyyy', { locale: fr })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(year)}
                    >
                      Modifier
                    </Button>
                    {!year.is_active && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetActive(year.id)}
                      >
                        Définir comme active
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteYearId(year.id)}
                      disabled={year.is_active}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucune année scolaire</h3>
              <p className="text-muted-foreground mb-4">
                Commencez par créer votre première année scolaire
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Créer une année scolaire
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de création */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouvelle année scolaire</DialogTitle>
            <DialogDescription>
              Créez une nouvelle année scolaire pour votre établissement
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="year_label">Nom de l'année *</Label>
                <Input
                  id="year_label"
                  value={formData.year_label}
                  onChange={(e) => setFormData({ ...formData, year_label: e.target.value })}
                  placeholder="Ex: 2024-2025"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Date de début *</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">Date de fin *</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    required
                  />
                </div>
              </div>
              
              {/* Section de copie des données */}
              {schoolYears && schoolYears.length > 0 && (
                <div className="border-t pt-4 mt-4">
                  <div className="flex items-center space-x-2 mb-4">
                    <Checkbox
                      id="copy_enabled"
                      checked={copyOptions.enabled}
                      onCheckedChange={(checked) => 
                        setCopyOptions({ ...copyOptions, enabled: checked as boolean })
                      }
                    />
                    <Label htmlFor="copy_enabled" className="font-medium">
                      Copier les données d'une année existante
                    </Label>
                  </div>
                  
                  {copyOptions.enabled && (
                    <div className="space-y-4 ml-6">
                      <div className="space-y-2">
                        <Label htmlFor="source_year">Année source *</Label>
                        <Select
                          value={copyOptions.sourceYearId}
                          onValueChange={(value) => 
                            setCopyOptions({ ...copyOptions, sourceYearId: value })
                          }
                        >
                          <SelectTrigger id="source_year">
                            <SelectValue placeholder="Choisir l'année à copier" />
                          </SelectTrigger>
                          <SelectContent>
                            {schoolYears.map((year) => (
                              <SelectItem key={year.id} value={year.id}>
                                {year.year_label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Éléments à copier :</Label>
                        <div className="flex flex-col space-y-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="copy_classes"
                              checked={copyOptions.copyClasses}
                              onCheckedChange={(checked) => 
                                setCopyOptions({ ...copyOptions, copyClasses: checked as boolean })
                              }
                            />
                            <Label htmlFor="copy_classes">Classes</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="copy_subjects"
                              checked={copyOptions.copySubjects}
                              onCheckedChange={(checked) => 
                                setCopyOptions({ ...copyOptions, copySubjects: checked as boolean })
                              }
                            />
                            <Label htmlFor="copy_subjects">Associations classe-matière</Label>
                          </div>
                        </div>
                      </div>

                      {/* Sélection individuelle des classes */}
                      {copyOptions.copyClasses && copyOptions.sourceYearId && (
                        <div className="space-y-2">
                          <Label>Classes à copier :</Label>
                          <ClassSelector
                            schoolId={schoolId}
                            yearId={copyOptions.sourceYearId}
                            selectedIds={selectedClassIds}
                            onSelectionChange={setSelectedClassIds}
                          />
                        </div>
                      )}

                      {/* Sélection individuelle des matières */}
                      {copyOptions.copySubjects && copyOptions.sourceYearId && (
                        <div className="space-y-2">
                          <Label>Matières à copier :</Label>
                          <SubjectSelector
                            schoolId={schoolId}
                            yearId={copyOptions.sourceYearId}
                            selectedIds={selectedSubjectIds}
                            onSelectionChange={setSelectedSubjectIds}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={createSchoolYear.isPending || copySchoolYearData.isPending}>
                {createSchoolYear.isPending || copySchoolYearData.isPending ? 'Création...' : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog d'édition */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier l'année scolaire</DialogTitle>
            <DialogDescription>
              Modifiez les informations de l'année scolaire
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit_year_label">Nom de l'année *</Label>
                <Input
                  id="edit_year_label"
                  value={formData.year_label}
                  onChange={(e) => setFormData({ ...formData, year_label: e.target.value })}
                  placeholder="Ex: 2024-2025"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_start_date">Date de début *</Label>
                  <Input
                    id="edit_start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_end_date">Date de fin *</Label>
                  <Input
                    id="edit_end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    required
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditDialog(false)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={updateSchoolYear.isPending}>
                {updateSchoolYear.isPending ? 'Modification...' : 'Modifier'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation de suppression */}
      <AlertDialog open={!!deleteYearId} onOpenChange={() => setDeleteYearId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l'année scolaire ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Toutes les données associées à cette année seront conservées
              mais ne seront plus liées à une année spécifique.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};