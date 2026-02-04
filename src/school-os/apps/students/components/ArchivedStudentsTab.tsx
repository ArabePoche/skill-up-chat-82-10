// Onglet pour afficher et gérer les élèves archivés (exclus ou transférés)
import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Search,
  Archive,
  RotateCcw,
  Trash2,
  UserX,
  ArrowRightLeft,
  Calendar,
  Loader2,
  User,
  Filter,
} from 'lucide-react';
import { useArchivedStudents, useRestoreStudent, useDeleteArchivedStudent, type ArchivedStudent, type ArchiveReason } from '../hooks/useArchivedStudents';
import { useSchoolClasses } from '@/school/hooks/useClasses';
import { useSchoolYear } from '@/school/context/SchoolYearContext';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export const ArchivedStudentsTab: React.FC = () => {
  const { user } = useAuth();
  const { school, activeSchoolYear } = useSchoolYear();
  const { data: archivedStudents = [], isLoading } = useArchivedStudents(school?.id);
  const { data: classes = [] } = useSchoolClasses(school?.id, activeSchoolYear?.id);
  const restoreStudent = useRestoreStudent();
  const deleteArchivedStudent = useDeleteArchivedStudent();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterReason, setFilterReason] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // Modal de restauration
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<ArchivedStudent | null>(null);
  const [targetClassId, setTargetClassId] = useState('');

  const filteredStudents = useMemo(() => {
    return archivedStudents.filter((student) => {
      const matchesSearch =
        student.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.student_code?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesReason =
        filterReason === 'all' || student.archive_reason === filterReason;

      return matchesSearch && matchesReason;
    });
  }, [archivedStudents, searchQuery, filterReason]);

  const getReasonBadge = (reason: ArchiveReason) => {
    switch (reason) {
      case 'exclusion':
        return (
          <Badge variant="destructive" className="text-xs">
            <UserX className="w-3 h-3 mr-1" />
            Exclusion
          </Badge>
        );
      case 'transfer':
        return (
          <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            <ArrowRightLeft className="w-3 h-3 mr-1" />
            Transfert
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-xs">
            <Archive className="w-3 h-3 mr-1" />
            Autre
          </Badge>
        );
    }
  };

  const handleOpenRestoreModal = (student: ArchivedStudent) => {
    setSelectedStudent(student);
    setTargetClassId('');
    setRestoreModalOpen(true);
  };

  const handleRestore = async () => {
    if (!selectedStudent || !targetClassId || !user?.id) return;

    await restoreStudent.mutateAsync({
      archivedStudentId: selectedStudent.id,
      targetClassId,
      restoredBy: user.id,
    });

    setRestoreModalOpen(false);
    setSelectedStudent(null);
    setTargetClassId('');
  };

  const handleDelete = async (studentId: string) => {
    await deleteArchivedStudent.mutateAsync(studentId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h3 className="text-lg font-semibold">Élèves archivés</h3>
          <p className="text-sm text-muted-foreground">
            {filteredStudents.length} élève{filteredStudents.length > 1 ? 's' : ''} archivé{filteredStudents.length > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className={`${showFilters ? "space-y-2" : ""}`}>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un élève archivé..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Button
            variant={showFilters ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="h-9 px-3"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtrer
          </Button>
        </div>

        {showFilters && (
          <Card>
            <CardContent className="p-3">
              <Select value={filterReason} onValueChange={setFilterReason}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Motif d'archivage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les motifs</SelectItem>
                  <SelectItem value="exclusion">Exclusion</SelectItem>
                  <SelectItem value="transfer">Transfert</SelectItem>
                  <SelectItem value="other">Autre</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}
      </div>

      {/* List */}
      {filteredStudents.length === 0 ? (
        <Card className="p-12 text-center">
          <Archive className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            {archivedStudents.length === 0
              ? "Aucun élève archivé"
              : "Aucun élève ne correspond aux critères"}
          </p>
        </Card>
      ) : (
        <ScrollArea className="h-[calc(100vh-400px)]">
          <div className="space-y-3">
            {filteredStudents.map((student) => (
              <Card key={student.id} className="hover:shadow-md transition-all">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={student.photo_url || undefined} />
                      <AvatarFallback className="bg-muted">
                        <User className="w-6 h-6 text-muted-foreground" />
                      </AvatarFallback>
                    </Avatar>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold">
                          {student.last_name} {student.first_name}
                        </p>
                        {getReasonBadge(student.archive_reason)}
                      </div>
                      
                      <p className="text-sm text-muted-foreground mt-1">
                        {student.student_code}
                      </p>

                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span>
                          Archivé le {format(new Date(student.archived_at), 'dd MMMM yyyy', { locale: fr })}
                        </span>
                      </div>

                      {student.archive_comment && (
                        <p className="text-sm text-muted-foreground mt-2 italic">
                          "{student.archive_comment}"
                        </p>
                      )}

                      {student.archive_reason === 'transfer' && student.target_school_name && (
                        <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                          Transféré vers: {student.target_school_name}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenRestoreModal(student)}
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Restaurer
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Supprimer
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer définitivement ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Cette action est irréversible. Toutes les données de cet élève seront
                              définitivement supprimées et ne pourront plus être récupérées.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(student.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Supprimer définitivement
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Restore Modal */}
      <Dialog open={restoreModalOpen} onOpenChange={setRestoreModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restaurer l'élève</DialogTitle>
            <DialogDescription>
              Sélectionnez la classe dans laquelle réintégrer l'élève
            </DialogDescription>
          </DialogHeader>

          {selectedStudent && (
            <div className="space-y-4 py-4">
              {/* Student info */}
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={selectedStudent.photo_url || undefined} />
                  <AvatarFallback>
                    {selectedStudent.first_name?.[0]}{selectedStudent.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">
                    {selectedStudent.first_name} {selectedStudent.last_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedStudent.student_code}
                  </p>
                </div>
              </div>

              {/* Class selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Classe de destination *</label>
                <Select value={targetClassId} onValueChange={setTargetClassId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une classe" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls: any) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name} {cls.cycle && `(${cls.cycle})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreModalOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleRestore}
              disabled={!targetClassId || restoreStudent.isPending}
            >
              {restoreStudent.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Restauration...
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Restaurer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
