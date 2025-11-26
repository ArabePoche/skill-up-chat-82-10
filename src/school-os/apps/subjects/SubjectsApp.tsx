// Application de gestion des matières (globales à l'école)
import React, { useState } from 'react';
import { BookOpen, Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useSchoolYear } from '@/school/context/SchoolYearContext';
import { useSchoolSubjects, useDeleteSubject } from './hooks/useSchoolSubjects';
import { CreateSubjectDialog } from './components/CreateSubjectDialog';
import { EditSubjectDialog } from './components/EditSubjectDialog';
import { Subject } from './types';

export const SubjectsApp: React.FC = () => {
  const { school } = useSchoolYear();
  const [searchQuery, setSearchQuery] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editSubject, setEditSubject] = useState<Subject | null>(null);

  const { data: subjects, isLoading } = useSchoolSubjects(school?.id);
  const deleteSubject = useDeleteSubject();

  if (!school?.id) {
    return (
      <div className="p-6 h-full overflow-auto">
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            Veuillez créer une école pour gérer les matières
          </p>
        </div>
      </div>
    );
  }

  const filteredSubjects = subjects?.filter(subject =>
    subject.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleDelete = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette matière ?')) {
      await deleteSubject.mutateAsync(id);
    }
  };

  return (
    <div className="p-6 h-full overflow-auto">
      <div className="space-y-6">
        {/* En-tête */}
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Gestion des Matières</h2>
              <p className="text-sm text-muted-foreground">
                Créez et gérez les matières de votre établissement
              </p>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle matière
            </Button>
          </div>

          {/* Barre de recherche */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher une matière..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-primary/10 rounded-lg">
                  <BookOpen className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Total Matières</p>
                  <p className="text-xl font-bold">{subjects?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Liste des matières */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredSubjects.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="p-4 bg-muted rounded-full mb-4">
                <BookOpen className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                {searchQuery ? 'Aucune matière trouvée' : 'Aucune matière'}
              </h3>
              <p className="text-muted-foreground mb-6 text-center max-w-sm">
                {searchQuery
                  ? 'Modifiez votre recherche pour trouver des matières'
                  : 'Commencez par créer vos premières matières pour les assigner aux classes'
                }
              </p>
              {!searchQuery && (
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer une matière
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredSubjects.map((subject) => (
              <Card
                key={subject.id}
                className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: `${subject.color}20` }}
                      >
                        <BookOpen
                          className="h-5 w-5"
                          style={{ color: subject.color }}
                        />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{subject.name}</CardTitle>
                        {subject.code && (
                          <Badge variant="outline" className="mt-1 text-xs">
                            {subject.code}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditSubject(subject)}
                        className="h-8 w-8"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(subject.id)}
                        className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {subject.description && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {subject.description}
                    </p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <CreateSubjectDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        schoolId={school.id}
      />

      <EditSubjectDialog
        subject={editSubject}
        open={!!editSubject}
        onOpenChange={(open) => !open && setEditSubject(null)}
      />
    </div>
  );
};
