// Liste des enseignants avec actions
import React, { useState } from 'react';
import { useTeachers, useDeleteTeacher } from '../hooks';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, Pencil, Trash2, UserCheck } from 'lucide-react';
import { TeacherDialog } from './TeacherDialog';
import { AssignmentDialog } from './AssignmentDialog';
import type { Teacher } from '../types';
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

export const TeachersList: React.FC = () => {
  const { data: teachers = [], isLoading } = useTeachers();
  const { mutate: deleteTeacher } = useDeleteTeacher();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);

  const handleEdit = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setDialogOpen(true);
  };

  const handleAssign = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setAssignmentDialogOpen(true);
  };

  const handleDelete = (teacher: Teacher) => {
    setTeacherToDelete(teacher);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (teacherToDelete) {
      deleteTeacher(teacherToDelete.id);
      setDeleteDialogOpen(false);
      setTeacherToDelete(null);
    }
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Chargement...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold">Enseignants ({teachers.length})</h3>
        <Button onClick={() => { setEditingTeacher(null); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Ajouter un enseignant
        </Button>
      </div>

      <div className="grid gap-4">
        {teachers.map((teacher) => (
          <Card key={teacher.id} className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={teacher.profiles?.avatar_url} />
                  <AvatarFallback>
                    {getInitials(teacher.profiles?.first_name, teacher.profiles?.last_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="font-semibold">
                    {teacher.profiles?.first_name} {teacher.profiles?.last_name}
                  </h4>
                  <p className="text-sm text-muted-foreground">{teacher.profiles?.email}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant={teacher.type === 'generalist' ? 'default' : 'secondary'}>
                      {teacher.type === 'generalist' ? 'Généraliste' : 'Spécialiste'}
                    </Badge>
                    {teacher.specialty && (
                      <Badge variant="outline">{teacher.specialty}</Badge>
                    )}
                    {!teacher.is_active && (
                      <Badge variant="destructive">Inactif</Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleAssign(teacher)}
                  title="Assigner"
                >
                  <UserCheck className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(teacher)}
                  title="Modifier"
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(teacher)}
                  title="Supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {teachers.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            Aucun enseignant. Cliquez sur "Ajouter un enseignant" pour commencer.
          </div>
        )}
      </div>

      <TeacherDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        teacher={editingTeacher}
      />

      {selectedTeacher && (
        <AssignmentDialog
          open={assignmentDialogOpen}
          onOpenChange={setAssignmentDialogOpen}
          teacher={selectedTeacher}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cet enseignant ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
