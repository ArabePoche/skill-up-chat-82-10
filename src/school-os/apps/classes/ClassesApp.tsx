/**
 * Application de gestion des classes de l'école
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, Plus, Search, Pencil, Trash2, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useSchoolYear } from '@/school/context/SchoolYearContext';
import { useSchoolClasses, useDeleteClass, Class } from '@/school/hooks/useClasses';
import { CreateClassDialog } from './components/CreateClassDialog';
import { EditClassDialog } from './components/EditClassDialog';

export const ClassesApp: React.FC = () => {
  const { t } = useTranslation();
  const { school, activeSchoolYear } = useSchoolYear();
  const [searchQuery, setSearchQuery] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editClass, setEditClass] = useState<Class | null>(null);

  const { data: classes, isLoading } = useSchoolClasses(school?.id, activeSchoolYear?.id);
  const deleteClass = useDeleteClass();

  if (!school?.id) {
    return (
      <div className="p-6 h-full overflow-auto">
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {t('schoolOS.common.noData')}
          </p>
        </div>
      </div>
    );
  }

  const filteredClasses = classes?.filter(cls =>
    cls.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleDelete = async (id: string) => {
    if (confirm(t('schoolOS.common.confirm'))) {
      await deleteClass.mutateAsync({ id, schoolId: school.id });
    }
  };

  const getCycleColor = (cycle: string) => {
    const colors: Record<string, string> = {
      maternel: '#F59E0B',
      primaire: '#10B981',
      collège: '#3B82F6',
      lycée: '#8B5CF6',
      université: '#EC4899',
    };
    return colors[cycle] || '#6B7280';
  };

  return (
    <div className="p-6 h-full overflow-auto">
      <div className="space-y-6">
        {/* En-tête */}
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">{t('schoolOS.classes.title')}</h2>
              <p className="text-sm text-muted-foreground">
                {t('schoolOS.classes.subtitle')}
              </p>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('schoolOS.classes.addClass')}
            </Button>
          </div>

          {/* Barre de recherche */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('schoolOS.common.search')}
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
                  <p className="text-xs font-medium text-muted-foreground">{t('schoolOS.common.total')}</p>
                  <p className="text-xl font-bold">{classes?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-green-500/10 rounded-lg">
                  <Users className="h-4 w-4 text-green-500" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{t('schoolOS.classes.totalStudents')}</p>
                  <p className="text-xl font-bold">
                    {classes?.reduce((sum, cls) => sum + (cls.current_students || 0), 0) || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Liste des classes */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredClasses.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="p-4 bg-muted rounded-full mb-4">
                <BookOpen className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                {searchQuery ? t('schoolOS.common.noData') : t('schoolOS.classes.noClasses')}
              </h3>
              <p className="text-muted-foreground mb-6 text-center max-w-sm">
                {searchQuery
                  ? t('schoolOS.common.noData')
                  : t('schoolOS.classes.noClasses')
                }
              </p>
              {!searchQuery && (
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('schoolOS.classes.addClass')}
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredClasses.map((cls) => (
              <Card
                key={cls.id}
                className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: `${getCycleColor(cls.cycle)}20` }}
                      >
                        <BookOpen
                          className="h-5 w-5"
                          style={{ color: getCycleColor(cls.cycle) }}
                        />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{cls.name}</CardTitle>
                        <Badge 
                          variant="outline" 
                          className="mt-1 text-xs capitalize"
                          style={{ borderColor: getCycleColor(cls.cycle), color: getCycleColor(cls.cycle) }}
                        >
                          {cls.cycle}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditClass(cls)}
                        className="h-8 w-8"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(cls.id)}
                        className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{cls.current_students} / {cls.max_students}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {cls.gender_type}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <CreateClassDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        schoolId={school.id}
        schoolYearId={activeSchoolYear?.id}
      />

      {editClass && (
        <EditClassDialog
          classData={editClass}
          open={!!editClass}
          onOpenChange={(open) => !open && setEditClass(null)}
        />
      )}
    </div>
  );
};
