import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Edit, Trash2, Plus, Layers } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import LevelsManagement from './LevelsManagement';
import DynamicFormationForm from './DynamicFormationForm';
import FormationPricingManager from './FormationPricingManager';

const FormationsManagement = () => {
  const [selectedFormation, setSelectedFormation] = useState<{ id: string; title: string } | null>(null);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingFormation, setEditingFormation] = useState<any>(null);
  const [isPricingDialogOpen, setIsPricingDialogOpen] = useState(false);
  const [pricingFormationId, setPricingFormationId] = useState<string | null>(null);
  const [pricingFormationLessons, setPricingFormationLessons] = useState<any[]>([]);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: formations, isLoading } = useQuery({
    queryKey: ['admin-formations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('formations')
        .select(`
          *,
          profiles:author_id (
            first_name,
            last_name,
            username
          ),
          teacher_formations (
            teachers (
              profiles (
                first_name,
                last_name,
                username
              )
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    }
  });

  const createCompleteFormationMutation = useMutation({
    mutationFn: async (formationData: any) => {
      console.log('Creating complete formation:', formationData);
      
      // Generate formation ID
      const formationId = crypto.randomUUID();
      
      try {
        // 1. Create formation
        const { data: formation, error: formationError } = await supabase
          .from('formations')
          .insert({
            id: formationId,
            title: formationData.title,
            description: formationData.description,
            badge: formationData.badge,
            duration: formationData.duration,
            price: formationData.price,
            original_price: formationData.originalPrice,
            promo_video_url: formationData.promoVideoUrl,
            thumbnail_url: formationData.thumbnailUrl,
            is_active: formationData.isActive,
            author_id: user?.id
          })
          .select()
          .single();

        if (formationError) throw formationError;

        // 2. Create levels, lessons, and exercises
        for (const levelData of formationData.levels) {
          const levelId = crypto.randomUUID();
          
          const { error: levelError } = await supabase
            .from('levels')
            .insert({
              id: levelId,
              formation_id: formationId,
              title: levelData.title,
              description: levelData.description,
              order_index: levelData.orderIndex
            });

          if (levelError) throw levelError;

          // Create lessons for this level - sorted by order_index
          const sortedLessons = levelData.lessons.sort((a: any, b: any) => a.orderIndex - b.orderIndex);
          
          for (const lessonData of sortedLessons) {
            const lessonId = crypto.randomUUID();
            
            const { error: lessonError } = await supabase
              .from('lessons')
              .insert({
                id: lessonId,
                level_id: levelId,
                title: lessonData.title,
                description: lessonData.description,
                video_url: lessonData.videoUrl,
                duration: lessonData.duration,
                order_index: lessonData.orderIndex,
                reference_id: crypto.randomUUID()
              });

            if (lessonError) throw lessonError;

            // Create exercises for this lesson
            for (const exerciseData of lessonData.exercises) {
              const exerciseId = crypto.randomUUID();
              
              const { error: exerciseError } = await supabase
                .from('exercises')
                .insert({
                  id: exerciseId,
                  lesson_id: lessonId,
                  title: exerciseData.title,
                  description: exerciseData.description,
                  type: exerciseData.type,
                  content: exerciseData.content
                });

              if (exerciseError) throw exerciseError;

              // Save uploaded files references in exercise_files table
              if (exerciseData.uploadedFiles && exerciseData.uploadedFiles.length > 0) {
                const fileInserts = exerciseData.uploadedFiles.map((file: any) => ({
                  id: crypto.randomUUID(),
                  exercise_id: exerciseId,
                  file_url: file.url,
                  file_type: file.type
                }));

                const { error: filesError } = await supabase
                  .from('exercise_files')
                  .insert(fileInserts);

                if (filesError) {
                  console.error('Error saving exercise files:', filesError);
                  throw filesError;
                }

                console.log(`Saved ${fileInserts.length} files for exercise ${exerciseId}`);
              }
            }
          }
        }

        return formation;
      } catch (error) {
        console.error('Error creating complete formation:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-formations'] });
      toast.success('Formation créée avec succès avec tous ses éléments et médias');
      setIsFormDialogOpen(false);
    },
    onError: (error) => {
      toast.error('Erreur lors de la création de la formation complète');
      console.error(error);
    }
  });

  const updateCompleteFormationMutation = useMutation({
    mutationFn: async ({ id, formationData }: { id: string; formationData: any }) => {
      console.log('Updating complete formation:', formationData);
      
      try {
        // 1. Update formation metadata
        const { error: formationError } = await supabase
          .from('formations')
          .update({
            title: formationData.title,
            description: formationData.description,
            badge: formationData.badge,
            duration: formationData.duration,
            price: formationData.price,
            original_price: formationData.originalPrice,
            promo_video_url: formationData.promoVideoUrl,
            thumbnail_url: formationData.thumbnailUrl,
            is_active: formationData.isActive
          })
          .eq('id', id);

        if (formationError) throw formationError;

        // 2. Process levels
        for (const levelData of formationData.levels) {
          if (levelData.id) {
            // Update existing level
            const { error: levelUpdateError } = await supabase
              .from('levels')
              .update({
                title: levelData.title,
                description: levelData.description,
                order_index: levelData.orderIndex
              })
              .eq('id', levelData.id);

            if (levelUpdateError) throw levelUpdateError;
          } else {
            // Create new level
            const levelId = crypto.randomUUID();
            const { error: levelCreateError } = await supabase
              .from('levels')
              .insert({
                id: levelId,
                formation_id: id,
                title: levelData.title,
                description: levelData.description,
                order_index: levelData.orderIndex
              });

            if (levelCreateError) throw levelCreateError;
            levelData.id = levelId; // Set the ID for lesson processing
          }

          // 3. Process lessons for this level - sorted by order_index
          const sortedLessons = levelData.lessons.sort((a: any, b: any) => a.orderIndex - b.orderIndex);
          
          for (const lessonData of sortedLessons) {
            if (lessonData.id) {
              // Update existing lesson
              const { error: lessonUpdateError } = await supabase
                .from('lessons')
                .update({
                  title: lessonData.title,
                  description: lessonData.description,
                  video_url: lessonData.videoUrl,
                  duration: lessonData.duration,
                  order_index: lessonData.orderIndex
                })
                .eq('id', lessonData.id);

              if (lessonUpdateError) throw lessonUpdateError;
            } else {
              // Create new lesson
              const lessonId = crypto.randomUUID();
              const { error: lessonCreateError } = await supabase
                .from('lessons')
                .insert({
                  id: lessonId,
                  level_id: levelData.id,
                  title: lessonData.title,
                  description: lessonData.description,
                  video_url: lessonData.videoUrl,
                  duration: lessonData.duration,
                  order_index: lessonData.orderIndex,
                  reference_id: crypto.randomUUID()
                });

              if (lessonCreateError) throw lessonCreateError;
              lessonData.id = lessonId; // Set the ID for exercise processing
            }

            // 4. Process exercises for this lesson
            for (const exerciseData of lessonData.exercises) {
              if (exerciseData.id) {
                // Update existing exercise
                const { error: exerciseUpdateError } = await supabase
                  .from('exercises')
                  .update({
                    title: exerciseData.title,
                    description: exerciseData.description,
                    type: exerciseData.type,
                    content: exerciseData.content
                  })
                  .eq('id', exerciseData.id);

                if (exerciseUpdateError) throw exerciseUpdateError;

                // Update exercise files
                if (exerciseData.uploadedFiles && exerciseData.uploadedFiles.length > 0) {
                  // Delete existing files for this exercise
                  await supabase
                    .from('exercise_files')
                    .delete()
                    .eq('exercise_id', exerciseData.id);

                  // Insert new files
                  const fileInserts = exerciseData.uploadedFiles.map((file: any) => ({
                    id: crypto.randomUUID(),
                    exercise_id: exerciseData.id,
                    file_url: file.url,
                    file_type: file.type
                  }));

                  const { error: filesError } = await supabase
                    .from('exercise_files')
                    .insert(fileInserts);

                  if (filesError) {
                    console.error('Error updating exercise files:', filesError);
                    throw filesError;
                  }

                  console.log(`Updated ${fileInserts.length} files for exercise ${exerciseData.id}`);
                }
              } else {
                // Create new exercise
                const exerciseId = crypto.randomUUID();
                const { error: exerciseCreateError } = await supabase
                  .from('exercises')
                  .insert({
                    id: exerciseId,
                    lesson_id: lessonData.id,
                    title: exerciseData.title,
                    description: exerciseData.description,
                    type: exerciseData.type,
                    content: exerciseData.content
                  });

                if (exerciseCreateError) throw exerciseCreateError;

                // Save uploaded files
                if (exerciseData.uploadedFiles && exerciseData.uploadedFiles.length > 0) {
                  const fileInserts = exerciseData.uploadedFiles.map((file: any) => ({
                    id: crypto.randomUUID(),
                    exercise_id: exerciseId,
                    file_url: file.url,
                    file_type: file.type
                  }));

                  const { error: filesError } = await supabase
                    .from('exercise_files')
                    .insert(fileInserts);

                  if (filesError) {
                    console.error('Error saving new exercise files:', filesError);
                    throw filesError;
                  }

                  console.log(`Saved ${fileInserts.length} files for new exercise ${exerciseId}`);
                }
              }
            }
          }
        }

        return { id };
      } catch (error) {
        console.error('Error updating formation:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-formations'] });
      toast.success('Formation mise à jour avec succès');
      setIsEditDialogOpen(false);
      setEditingFormation(null);
    },
    onError: (error) => {
      toast.error('Erreur lors de la mise à jour de la formation');
      console.error(error);
    }
  });

  const deleteFormationMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('formations')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-formations'] });
      toast.success('Formation supprimée avec succès');
    },
    onError: (error) => {
      toast.error('Erreur lors de la suppression de la formation');
      console.error(error);
    }
  });

  const handleEdit = async (formation: any) => {
    try {
      console.log('Loading formation for edit:', formation.id);
      
      // Fetch complete formation data with levels, lessons, and exercises - with proper ordering
      const { data: completeFormation, error } = await supabase
        .from('formations')
        .select(`
          *,
          levels (
            *,
            lessons (
              *,
              exercises!exercises_lesson_id_fkey (
                *,
                exercise_files (*)
              )
            )
          )
        `)
        .eq('id', formation.id)
        .single();

      if (error) {
        console.error('Error fetching formation for edit:', error);
        throw error;
      }

      console.log('Complete formation data loaded:', completeFormation);

      // Transform and sort data for the form - CRITICAL: Sort by order_index
      const formattedFormation = {
        ...completeFormation,
        originalPrice: completeFormation.original_price,
        promoVideoUrl: completeFormation.promo_video_url,
        thumbnailUrl: completeFormation.thumbnail_url,
        isActive: completeFormation.is_active,
        levels: completeFormation.levels
          ?.sort((a: any, b: any) => a.order_index - b.order_index) // Sort levels by order_index
          ?.map((level: any) => ({
            ...level,
            orderIndex: level.order_index,
            lessons: level.lessons
              ?.sort((a: any, b: any) => a.order_index - b.order_index) // Sort lessons by order_index
              ?.map((lesson: any) => ({
                ...lesson,
                videoUrl: lesson.video_url,
                orderIndex: lesson.order_index,
                exercises: lesson.exercises?.map((exercise: any) => ({
                  ...exercise,
                  uploadedFiles: exercise.exercise_files?.map((file: any) => ({
                    url: file.file_url,
                    type: file.file_type
                  })) || []
                })) || []
              })) || []
          })) || []
      };

      console.log('Formatted formation for editing:', formattedFormation);
      setEditingFormation(formattedFormation);
      setIsEditDialogOpen(true);
    } catch (error) {
      console.error('Error loading formation for edit:', error);
      toast.error('Erreur lors du chargement de la formation');
    }
  };

  const [pricingFormationLevels, setPricingFormationLevels] = useState<any[]>([]);

  const handleConfigurePricing = async (formationId: string) => {
    try {
      // Récupérer les niveaux et leçons de la formation pour le composant de pricing
      const { data: levels, error } = await supabase
        .from('levels')
        .select(`
          *,
          lessons (
            id,
            title,
            order_index
          )
        `)
        .eq('formation_id', formationId)
        .order('order_index');

      if (error) throw error;

      // Formatter les niveaux avec leurs leçons triées
      const formattedLevels = levels?.map(level => ({
        id: level.id,
        title: level.title,
        lessons: level.lessons
          ?.sort((a: any, b: any) => a.order_index - b.order_index)
          ?.map((lesson: any) => ({
            id: lesson.id,
            title: lesson.title
          })) || []
      })) || [];

      const allLessons = levels?.flatMap(level => 
        level.lessons?.map((lesson: any) => ({
          id: lesson.id,
          title: lesson.title
        })) || []
      ) || [];

      setPricingFormationId(formationId);
      setPricingFormationLessons(allLessons);
      setPricingFormationLevels(formattedLevels);
      setIsPricingDialogOpen(true);
    } catch (error) {
      console.error('Error loading lessons for pricing:', error);
      toast.error('Erreur lors du chargement des leçons');
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette formation ?')) {
      deleteFormationMutation.mutate(id);
    }
  };

  if (selectedFormation) {
    return (
      <LevelsManagement
        formationId={selectedFormation.id}
        formationTitle={selectedFormation.title}
        onBack={() => setSelectedFormation(null)}
      />
    );
  }

  if (isLoading) {
    return <div className="text-center py-8">Chargement des formations...</div>;
  }

  const getTeacherNames = (teacherFormations: any[]) => {
    if (!teacherFormations || teacherFormations.length === 0) {
      return 'Aucun enseignant assigné';
    }
    
    return teacherFormations
      .map(tf => {
        const profile = tf.teachers?.profiles;
        if (profile?.first_name && profile?.last_name) {
          return `${profile.first_name} ${profile.last_name}`;
        }
        return profile?.username || 'Enseignant';
      })
      .join(', ');
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Gestion des formations</CardTitle>
        <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#25d366] hover:bg-[#25d366]/90">
              <Plus size={16} className="mr-2" />
              Nouvelle formation complète
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Créer une formation complète</DialogTitle>
            </DialogHeader>
            <DynamicFormationForm
              onSubmit={(data) => createCompleteFormationMutation.mutate(data)}
              isLoading={createCompleteFormationMutation.isPending}
            />
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Modifier la formation</DialogTitle>
            </DialogHeader>
            {editingFormation && (
              <DynamicFormationForm
                onSubmit={(data) => updateCompleteFormationMutation.mutate({ 
                  id: editingFormation.id, 
                  formationData: data 
                })}
                isLoading={updateCompleteFormationMutation.isPending}
                initialData={editingFormation}
                isEditing={true}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Pricing Dialog */}
        <Dialog open={isPricingDialogOpen} onOpenChange={setIsPricingDialogOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Configuration des tarifs d'abonnement</DialogTitle>
            </DialogHeader>
            {pricingFormationId && (
              <FormationPricingManager
                formationId={pricingFormationId}
                lessons={pricingFormationLessons}
                levels={pricingFormationLevels}
                onClose={() => setIsPricingDialogOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titre</TableHead>
              <TableHead>Auteur</TableHead>
              <TableHead>Enseignants</TableHead>
              <TableHead>Badge</TableHead>
              <TableHead>Prix</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {formations?.map((formation) => (
              <TableRow key={formation.id}>
                <TableCell className="font-medium">{formation.title}</TableCell>
                <TableCell>
                  {formation.profiles ? 
                    `${formation.profiles.first_name || ''} ${formation.profiles.last_name || ''}`.trim() || 
                    formation.profiles.username || 'Auteur inconnu' : 'Auteur inconnu'}
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {getTeacherNames(formation.teacher_formations)}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {formation.badge || 'N/A'}
                  </Badge>
                </TableCell>
                <TableCell>{formation.price ? `${formation.price.toLocaleString('fr-FR')} FCFA` : 'Gratuit'}</TableCell>
                <TableCell>
                  <Badge variant={formation.is_active ? 'default' : 'destructive'}>
                    {formation.is_active ? 'Actif' : 'Inactif'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedFormation({ id: formation.id, title: formation.title })}
                    >
                      <Layers size={14} className="mr-1" />
                      Niveaux
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleConfigurePricing(formation.id)}
                      className="text-purple-600"
                    >
                      💳
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleEdit(formation)}
                    >
                      <Edit size={14} />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(formation.id)}
                      className="text-red-600"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default FormationsManagement;