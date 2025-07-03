import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Edit, Trash2, Plus, ArrowLeft, FileText, Play } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ExercisesManagement from './ExercisesManagement';

interface LessonsManagementProps {
  levelId: string;
  levelTitle: string;
  formationTitle: string;
  onBack: () => void;
}

const LessonsManagement: React.FC<LessonsManagementProps> = ({ 
  levelId, 
  levelTitle, 
  formationTitle, 
  onBack 
}) => {
  const [selectedLesson, setSelectedLesson] = useState<{ id: string; title: string } | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: lessons, isLoading } = useQuery({
    queryKey: ['lessons', levelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('level_id', levelId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      return data || [];
    }
  });

  const createLessonMutation = useMutation({
    mutationFn: async (lessonData: {
      title: string;
      description: string;
      order_index: number;
      video_url?: string;
      duration?: string;
    }) => {
      const { data, error } = await supabase
        .from('lessons')
        .insert({
          ...lessonData,
          level_id: levelId
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons', levelId] });
      toast.success('Leçon créée avec succès');
      setIsCreateDialogOpen(false);
    },
    onError: (error) => {
      toast.error('Erreur lors de la création de la leçon');
      console.error(error);
    }
  });

  const updateLessonMutation = useMutation({
    mutationFn: async ({ id, lessonData }: { 
      id: string; 
      lessonData: { title: string; description: string; order_index: number; video_url?: string; duration?: string; }
    }) => {
      const { data, error } = await supabase
        .from('lessons')
        .update(lessonData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons', levelId] });
      toast.success('Leçon mise à jour avec succès');
      setIsEditDialogOpen(false);
      setEditingLesson(null);
    },
    onError: (error) => {
      toast.error('Erreur lors de la mise à jour de la leçon');
      console.error(error);
    }
  });

  const deleteLessonMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('lessons')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons', levelId] });
      toast.success('Leçon supprimée avec succès');
    },
    onError: (error) => {
      toast.error('Erreur lors de la suppression de la leçon');
      console.error(error);
    }
  });

  const handleCreateSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const order_index = parseInt(formData.get('order_index') as string) || 1;
    const video_url = formData.get('video_url') as string;
    const duration = formData.get('duration') as string;

    createLessonMutation.mutate({ title, description, order_index, video_url, duration });
  };

  const handleEditSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const order_index = parseInt(formData.get('order_index') as string) || 1;
    const video_url = formData.get('video_url') as string;
    const duration = formData.get('duration') as string;

    updateLessonMutation.mutate({ 
      id: editingLesson.id, 
      lessonData: { title, description, order_index, video_url, duration }
    });
  };

  const handleEdit = (lesson: any) => {
    setEditingLesson(lesson);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette leçon ?')) {
      deleteLessonMutation.mutate(id);
    }
  };

  if (selectedLesson) {
    return (
      <ExercisesManagement
        lessonId={selectedLesson.id}
        lessonTitle={selectedLesson.title}
        levelTitle={levelTitle}
        formationTitle={formationTitle}
        onBack={() => setSelectedLesson(null)}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-green-700">Chargement des leçons...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50">
      <ScrollArea className="h-screen">
        <div className="p-3 sm:p-4 md:p-6 pb-20 md:pb-6">
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-t-lg p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center space-x-3 min-w-0">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={onBack} 
                    className="text-white hover:bg-white/20 flex-shrink-0"
                  >
                    <ArrowLeft size={16} />
                  </Button>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-lg sm:text-xl truncate">Leçons du niveau</CardTitle>
                    <p className="text-green-100 text-xs sm:text-sm mt-1 truncate">
                      {formationTitle} → {levelTitle}
                    </p>
                  </div>
                </div>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-white text-green-600 hover:bg-green-50 flex-shrink-0">
                      <Plus size={16} className="mr-2" />
                      <span className="hidden sm:inline">Nouvelle leçon</span>
                      <span className="sm:hidden">Nouveau</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md sm:max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Créer une nouvelle leçon</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateSubmit} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Titre</label>
                        <Input name="title" required />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Description</label>
                        <Textarea name="description" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Numéro d'ordre</label>
                        <Input name="order_index" type="number" min="1" defaultValue="1" required />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">URL de la vidéo</label>
                        <Input name="video_url" type="url" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Durée</label>
                        <Input name="duration" placeholder="ex: 30 min" />
                      </div>
                      <Button type="submit" className="w-full" disabled={createLessonMutation.isPending}>
                        {createLessonMutation.isPending ? 'Création...' : 'Créer la leçon'}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-300px)]">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold">Ordre</TableHead>
                        <TableHead className="font-semibold">Titre</TableHead>
                        <TableHead className="font-semibold hidden sm:table-cell">Description</TableHead>
                        <TableHead className="font-semibold hidden md:table-cell">Durée</TableHead>
                        <TableHead className="font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lessons?.map((lesson, index) => (
                        <TableRow 
                          key={lesson.id}
                          className={`transition-colors hover:bg-green-50 ${
                            index % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                          }`}
                        >
                          <TableCell>
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm font-medium">
                              {lesson.order_index}
                            </span>
                          </TableCell>
                          <TableCell className="font-medium text-gray-900">
                            <div className="flex items-center space-x-2">
                              {lesson.video_url && <Play size={16} className="text-green-600 flex-shrink-0" />}
                              <span className="truncate max-w-[150px] sm:max-w-none">{lesson.title}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-600 hidden sm:table-cell">
                            <span className="truncate block max-w-[200px]">{lesson.description}</span>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {lesson.duration && (
                              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                                {lesson.duration}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col sm:flex-row gap-1 sm:gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedLesson({ id: lesson.id, title: lesson.title })}
                                className="text-green-600 border-green-200 hover:bg-green-50 text-xs"
                              >
                                <FileText size={12} className="mr-1" />
                                <span className="hidden sm:inline">Exercices</span>
                                <span className="sm:hidden">Ex.</span>
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-gray-600 hover:bg-gray-50"
                                onClick={() => handleEdit(lesson)}
                              >
                                <Edit size={12} />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDelete(lesson.id)}
                                className="text-red-600 border-red-200 hover:bg-red-50"
                              >
                                <Trash2 size={12} />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Edit Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-md sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Modifier la leçon</DialogTitle>
              </DialogHeader>
              {editingLesson && (
                <form onSubmit={handleEditSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Titre</label>
                    <Input name="title" defaultValue={editingLesson.title} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <Textarea name="description" defaultValue={editingLesson.description} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Numéro d'ordre</label>
                    <Input 
                      name="order_index" 
                      type="number" 
                      min="1" 
                      defaultValue={editingLesson.order_index} 
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">URL de la vidéo</label>
                    <Input name="video_url" type="url" defaultValue={editingLesson.video_url} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Durée</label>
                    <Input name="duration" placeholder="ex: 30 min" defaultValue={editingLesson.duration} />
                  </div>
                  <Button type="submit" className="w-full" disabled={updateLessonMutation.isPending}>
                    {updateLessonMutation.isPending ? 'Mise à jour...' : 'Mettre à jour la leçon'}
                  </Button>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </ScrollArea>
    </div>
  );
};

export default LessonsManagement;
