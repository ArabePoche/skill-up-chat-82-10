import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Edit, Trash2, Plus, ArrowLeft, FileText, Award, Upload } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import MultiFileUploader from './exercise/MultiFileUploader';

interface ExercisesManagementProps {
  lessonId: string;
  lessonTitle: string;
  levelTitle: string;
  formationTitle: string;
  onBack: () => void;
}

const ExercisesManagement: React.FC<ExercisesManagementProps> = ({ 
  lessonId, 
  lessonTitle, 
  levelTitle, 
  formationTitle, 
  onBack 
}) => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<any>(null);
  const [editingFiles, setEditingFiles] = useState<{ url: string; type: string; name?: string }[]>([]);
  const [createFiles, setCreateFiles] = useState<{ url: string; type: string; name?: string }[]>([]);
  const queryClient = useQueryClient();

  const { data: exercises, isLoading } = useQuery({
    queryKey: ['exercises', lessonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercises')
        .select(`
          *,
          exercise_files (
            id,
            file_url,
            file_type
          )
        `)
        .eq('lesson_id', lessonId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    }
  });

  const createExerciseMutation = useMutation({
    mutationFn: async (exerciseData: {
      title: string;
      description: string;
      content: string;
      type: string;
      files?: { url: string; type: string; name?: string }[];
    }) => {
      console.log('Creating exercise with data:', exerciseData);
      
      // Créer l'exercice d'abord
      const { data: exerciseResponse, error: exerciseError } = await supabase
        .from('exercises')
        .insert({
          title: exerciseData.title,
          description: exerciseData.description,
          content: exerciseData.content,
          type: exerciseData.type,
          lesson_id: lessonId
        })
        .select()
        .single();

      if (exerciseError) {
        console.error('Error creating exercise:', exerciseError);
        throw exerciseError;
      }

      console.log('Exercise created successfully:', exerciseResponse);

      // Sauvegarder les fichiers dans exercise_files si il y en a
      if (exerciseData.files && exerciseData.files.length > 0 && exerciseResponse) {
        console.log('Saving', exerciseData.files.length, 'files to exercise_files table for exercise:', exerciseResponse.id);
        
        const fileInserts = exerciseData.files.map(file => ({
          exercise_id: exerciseResponse.id,
          file_url: file.url,
          file_type: file.type
        }));

        console.log('File inserts to be made:', fileInserts);

        const { data: filesData, error: filesError } = await supabase
          .from('exercise_files')
          .insert(fileInserts)
          .select();

        if (filesError) {
          console.error('Error saving exercise files to database:', filesError);
          // Ne pas faire échouer toute la création si les fichiers ne peuvent pas être sauvés
          toast.error('Exercice créé mais erreur lors de la sauvegarde des fichiers');
        } else {
          console.log('Files saved successfully to exercise_files table:', filesData);
        }
      }

      return exerciseResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises', lessonId] });
      toast.success('Exercice créé avec succès');
      setIsCreateDialogOpen(false);
      setCreateFiles([]);
    },
    onError: (error) => {
      toast.error('Erreur lors de la création de l\'exercice');
      console.error('Create exercise error:', error);
    }
  });

  const updateExerciseMutation = useMutation({
    mutationFn: async ({ id, exerciseData, files }: { 
      id: string; 
      exerciseData: { title: string; description: string; content: string; type: string; };
      files?: { url: string; type: string; name?: string }[];
    }) => {
      console.log('Updating exercise:', id, 'with data:', exerciseData, 'and files:', files);
      
      const { data, error } = await supabase
        .from('exercises')
        .update(exerciseData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating exercise:', error);
        throw error;
      }

      // Handle file updates if provided
      if (files !== undefined) {
        console.log('Updating files for exercise:', id);
        
        // Delete existing files first
        const { error: deleteError } = await supabase
          .from('exercise_files')
          .delete()
          .eq('exercise_id', id);

        if (deleteError) {
          console.error('Error deleting old exercise files:', deleteError);
        }

        // Add new files if any
        if (files.length > 0) {
          const fileInserts = files.map(file => ({
            exercise_id: id,
            file_url: file.url,
            file_type: file.type
          }));

          console.log('Inserting new files:', fileInserts);

          const { data: filesData, error: filesError } = await supabase
            .from('exercise_files')
            .insert(fileInserts)
            .select();

          if (filesError) {
            console.error('Error updating exercise files:', filesError);
            toast.error('Exercice mis à jour mais erreur lors de la sauvegarde des fichiers');
          } else {
            console.log(`Updated ${filesData.length} files for exercise ${id}`);
          }
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises', lessonId] });
      toast.success('Exercice mis à jour avec succès');
      setIsEditDialogOpen(false);
      setEditingExercise(null);
      setEditingFiles([]);
    },
    onError: (error) => {
      toast.error('Erreur lors de la mise à jour de l\'exercice');
      console.error('Update exercise error:', error);
    }
  });

  const deleteExerciseMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('exercises')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises', lessonId] });
      toast.success('Exercice supprimé avec succès');
    },
    onError: (error) => {
      toast.error('Erreur lors de la suppression de l\'exercice');
      console.error(error);
    }
  });

  const handleCreateSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const content = formData.get('content') as string;
    const type = formData.get('type') as string;

    console.log('Submitting exercise creation with files:', createFiles);

    createExerciseMutation.mutate({ 
      title, 
      description, 
      content, 
      type,
      files: createFiles
    });
  };

  const handleEditSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const content = formData.get('content') as string;
    const type = formData.get('type') as string;

    console.log('Submitting exercise update with files:', editingFiles);

    updateExerciseMutation.mutate({ 
      id: editingExercise.id, 
      exerciseData: { title, description, content, type },
      files: editingFiles
    });
  };

  const handleEdit = (exercise: any) => {
    setEditingExercise(exercise);
    // Convert exercise files to the expected format
    const files = exercise.exercise_files?.map((file: any) => ({
      url: file.file_url,
      type: file.file_type,
      name: 'Fichier existant'
    })) || [];
    setEditingFiles(files);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet exercice ?')) {
      deleteExerciseMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-purple-700">Chargement des exercices...</p>
        </div>
      </div>
    );
  }

  const getExerciseTypeColor = (type: string) => {
    switch (type) {
      case 'practical': return 'bg-purple-100 text-purple-800';
      case 'quiz': return 'bg-orange-100 text-orange-800';
      case 'assignment': return 'bg-blue-100 text-blue-800';
      case 'project': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getExerciseTypeIcon = (type: string) => {
    switch (type) {
      case 'practical': return <FileText size={12} />;
      case 'quiz': return <Award size={12} />;
      default: return <FileText size={12} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      <ScrollArea className="h-screen">
        <div className="p-3 sm:p-4 md:p-6 pb-20 md:pb-6">
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-t-lg p-4 sm:p-6">
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
                    <CardTitle className="text-lg sm:text-xl truncate">Exercices de la leçon</CardTitle>
                    <p className="text-purple-100 text-xs sm:text-sm mt-1 truncate">
                      {formationTitle} → {levelTitle} → {lessonTitle}
                    </p>
                  </div>
                </div>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-white text-purple-600 hover:bg-purple-50 flex-shrink-0">
                      <Plus size={16} className="mr-2" />
                      <span className="hidden sm:inline">Nouvel exercice</span>
                      <span className="sm:hidden">Nouveau</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Créer un nouvel exercice</DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="max-h-[70vh] pr-4">
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
                          <label className="block text-sm font-medium mb-1">Type</label>
                          <Select name="type" defaultValue="practical">
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="practical">Exercice pratique</SelectItem>
                              <SelectItem value="quiz">Quiz</SelectItem>
                              <SelectItem value="assignment">Devoir</SelectItem>
                              <SelectItem value="project">Projet</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Contenu/Instructions</label>
                          <Textarea name="content" rows={6} required />
                        </div>
                        <div>
                          <MultiFileUploader
                            onFilesChange={setCreateFiles}
                            existingFiles={createFiles}
                            disabled={createExerciseMutation.isPending}
                          />
                        </div>
                        <Button type="submit" className="w-full" disabled={createExerciseMutation.isPending}>
                          {createExerciseMutation.isPending ? 'Création...' : 'Créer l\'exercice'}
                        </Button>
                      </form>
                    </ScrollArea>
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
                        <TableHead className="font-semibold">Titre</TableHead>
                        <TableHead className="font-semibold">Type</TableHead>
                        <TableHead className="font-semibold hidden sm:table-cell">Description</TableHead>
                        <TableHead className="font-semibold hidden md:table-cell">Fichiers</TableHead>
                        <TableHead className="font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {exercises?.map((exercise, index) => (
                        <TableRow 
                          key={exercise.id}
                          className={`transition-colors hover:bg-purple-50 ${
                            index % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                          }`}
                        >
                          <TableCell className="font-medium text-gray-900">
                            <span className="truncate block max-w-[150px] sm:max-w-none">{exercise.title}</span>
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 w-fit ${getExerciseTypeColor(exercise.type || 'practical')}`}>
                              {getExerciseTypeIcon(exercise.type || 'practical')}
                              <span className="hidden sm:inline">{exercise.type || 'Exercice'}</span>
                            </span>
                          </TableCell>
                          <TableCell className="text-gray-600 hidden sm:table-cell">
                            <span className="truncate block max-w-[200px]">{exercise.description}</span>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {exercise.exercise_files && exercise.exercise_files.length > 0 ? (
                              <span className="text-sm text-blue-600">
                                {exercise.exercise_files.length} fichier(s)
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">Aucun fichier</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col sm:flex-row gap-1 sm:gap-2">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-gray-600 hover:bg-gray-50 text-xs"
                                onClick={() => handleEdit(exercise)}
                              >
                                <Edit size={12} />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDelete(exercise.id)}
                                className="text-red-600 border-red-200 hover:bg-red-50 text-xs"
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
            <DialogContent className="max-w-md sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Modifier l'exercice</DialogTitle>
              </DialogHeader>
              {editingExercise && (
                <ScrollArea className="max-h-[70vh] pr-4">
                  <form onSubmit={handleEditSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Titre</label>
                      <Input name="title" defaultValue={editingExercise.title} required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Description</label>
                      <Textarea name="description" defaultValue={editingExercise.description} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Type</label>
                      <Select name="type" defaultValue={editingExercise.type || 'practical'}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="practical">Exercice pratique</SelectItem>
                          <SelectItem value="quiz">Quiz</SelectItem>
                          <SelectItem value="assignment">Devoir</SelectItem>
                          <SelectItem value="project">Projet</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Contenu/Instructions</label>
                      <Textarea name="content" rows={6} defaultValue={editingExercise.content} required />
                    </div>
                    <div>
                      <MultiFileUploader
                        onFilesChange={setEditingFiles}
                        existingFiles={editingFiles}
                        disabled={updateExerciseMutation.isPending}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={updateExerciseMutation.isPending}>
                      {updateExerciseMutation.isPending ? 'Mise à jour...' : 'Mettre à jour l\'exercice'}
                    </Button>
                  </form>
                </ScrollArea>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </ScrollArea>
    </div>
  );
};

export default ExercisesManagement;