/**
 * Hook pour soumettre un exercice dans le contexte du chat de groupe
 * Adapté pour la logique basée sur le niveau (level) plutôt que sur une leçon unique
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export const useSubmitGroupExercise = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      exerciseId,
      content,
      file,
      formationId,
      levelId
    }: {
      exerciseId: string;
      content: string;
      file?: File;
      formationId: string;
      levelId: string;
    }) => {
      if (!user?.id) {
        throw new Error('Utilisateur non authentifié');
      }

      let fileUrl = null;
      let fileName = null;
      let fileType = null;

      // Si un fichier est fourni, l'uploader dans le bucket students_exercises_submission_files
      if (file) {
        console.log('Uploading group exercise file:', file.name, file.type);
        
        const fileExt = file.name.split('.').pop();
        const filePath = `${user.id}/${levelId}/${exerciseId}/${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('students_exercises_submission_files')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Error uploading group exercise file:', uploadError);
          throw uploadError;
        }

        // Obtenir l'URL publique du fichier
        const { data: { publicUrl } } = supabase.storage
          .from('students_exercises_submission_files')
          .getPublicUrl(filePath);

        fileUrl = publicUrl;
        fileName = file.name;
        fileType = file.type;
        
        console.log('Group exercise file uploaded successfully:', { fileUrl, fileName, fileType });
      }

      // Récupérer les informations de l'exercice pour obtenir le lesson_id
      const { data: exerciseData, error: exerciseError } = await supabase
        .from('exercises')
        .select('lesson_id')
        .eq('id', exerciseId)
        .single();

      if (exerciseError || !exerciseData) {
        console.error('Error fetching exercise data:', exerciseError);
        throw new Error('Exercice introuvable');
      }

      const lessonId = exerciseData.lesson_id;

      console.log('🎯 Submitting group exercise:', { 
        exerciseId, 
        lessonId, 
        formationId, 
        levelId, 
        content,
        userId: user.id
      });

      // Vérifier que l'utilisateur est inscrit à la formation
      const { data: enrollmentCheck, error: enrollmentError } = await supabase
        .from('enrollment_requests')
        .select('id')
        .eq('user_id', user.id)
        .eq('formation_id', formationId)
        .eq('status', 'approved')
        .maybeSingle();

      if (enrollmentError) {
        console.error('Error checking enrollment:', enrollmentError);
        throw new Error('Erreur lors de la vérification de l\'inscription à la formation');
      }

      if (!enrollmentCheck) {
        throw new Error('Vous n\'êtes pas inscrit à cette formation');
      }

      // Récupérer la promotion de l'utilisateur pour cette formation
      const { data: studentPromotion, error: promotionError } = await supabase
        .from('student_promotions')
        .select(`
          promotion_id,
          promotions!inner (
            formation_id
          )
        `)
        .eq('student_id', user.id)
        .eq('promotions.formation_id', formationId)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (promotionError) {
        console.error('Error fetching student promotion:', promotionError);
      }

      // Insérer la soumission d'exercice dans lesson_messages
      const { data, error } = await supabase
        .from('lesson_messages')
        .insert({
          lesson_id: lessonId,
          formation_id: formationId,
          sender_id: user.id,
          content: content,
          message_type: fileUrl ? 'file' : 'text',
          file_url: fileUrl,
          file_type: fileType,
          file_name: fileName,
          is_exercise_submission: true,
          exercise_status: null,
          exercise_id: exerciseId,
          promotion_id: studentPromotion?.promotion_id,
          level_id: levelId
        })
        .select()
        .single();

      if (error) {
        console.error('Error submitting group exercise:', error);
        throw error;
      }

      // Mettre à jour le statut de la leçon à 'in_progress'
      const { error: progressError } = await supabase
        .from('user_lesson_progress')
        .upsert({
          user_id: user.id,
          lesson_id: lessonId,
          level_id: levelId,
          status: 'in_progress',
          exercise_completed: false,
          create_at: new Date().toISOString()
        });

      if (progressError) {
        console.error('Error updating lesson progress:', progressError);
      }
      
      console.log('Group exercise submitted:', data);
      return data;
    },
    onSuccess: (data) => {
      // Invalider les requêtes spécifiques au chat de groupe
      queryClient.invalidateQueries({ 
        queryKey: ['group-chat-messages', data.formation_id, data.level_id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['level-exercises', data.level_id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['lesson-unlocking'] 
      });
      toast.success('Exercice soumis avec succès !');
    },
    onError: (error) => {
      console.error('Erreur lors de la soumission de l\'exercice de groupe:', error);
      toast.error('Erreur lors de la soumission de l\'exercice');
    },
  });
};