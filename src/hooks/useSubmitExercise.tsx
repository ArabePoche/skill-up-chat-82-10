
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export const useSubmitExercise = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      lessonId, 
      formationId, 
      exerciseId,
      content,
      file
    }: {
      lessonId: string;
      formationId: string;
      exerciseId: string;
      content: string;
      file?: File;
    }) => {
      if (!user?.id) {
        throw new Error('Utilisateur non authentifié');
      }

      let fileUrl = null;
      let fileName = null;
      let fileType = null;

      // Si un fichier est fourni, l'uploader dans le bucket students_exercises_submission_files
      if (file) {
        console.log('Uploading exercise file:', file.name, file.type);
        
        const fileExt = file.name.split('.').pop();
        const filePath = `${user.id}/${lessonId}/${exerciseId}/${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('students_exercises_submission_files')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Error uploading exercise file:', uploadError);
          throw uploadError;
        }

        // Obtenir l'URL publique du fichier
        const { data: { publicUrl } } = supabase.storage
          .from('students_exercises_submission_files')
          .getPublicUrl(filePath);

        fileUrl = publicUrl;
        fileName = file.name;
        fileType = file.type;
        
        console.log('Exercise file uploaded successfully:', { fileUrl, fileName, fileType });
      }

      console.log('Submitting exercise via lesson_messages:', { lessonId, formationId, exerciseId, content });

      // Vérifier que la leçon existe et que l'utilisateur y a accès
      const { data: lessonExists, error: lessonCheckError } = await supabase
        .from('user_lesson_progress')
        .select('lesson_id')
        .eq('user_id', user.id)
        .eq('lesson_id', lessonId)
        .maybeSingle();

      if (lessonCheckError) {
        console.error('Error checking lesson access:', lessonCheckError);
        throw new Error('Erreur lors de la vérification de l\'accès à la leçon');
      }

      if (!lessonExists) {
        throw new Error('Vous n\'avez pas accès à cette leçon ou elle n\'existe pas');
      }

      // Récupérer la promotion de l'utilisateur pour cette formation
      const { data: studentPromotion } = await supabase
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

      // Récupérer le level_id de la leçon
      const { data: lessonData } = await supabase
        .from('lessons')
        .select('level_id')
        .eq('id', lessonId)
        .single();

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
          level_id: lessonData?.level_id
        })
        .select()
        .single();

      if (error) {
        console.error('Error submitting exercise:', error);
        throw error;
      }

      // Mettre à jour le statut de la leçon à 'in_progress' en utilisant le level_id déjà récupéré
      const { error: progressError } = await supabase
        .from('user_lesson_progress')
        .upsert({
          user_id: user.id,
          lesson_id: lessonId,
          level_id: lessonData?.level_id,
          status: 'in_progress',
          exercise_completed: false,
          create_at: new Date().toISOString()
        });

      if (progressError) {
        console.error('Error updating lesson progress:', progressError);
      }
      
      console.log('Exercise submitted:', data);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ['student-messages', data.lesson_id, data.formation_id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['teacher-messages', data.lesson_id, data.formation_id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['lesson-unlocking'] 
      });
      toast.success('Exercice soumis avec succès !');
    },
    onError: (error) => {
      console.error('Erreur lors de la soumission:', error);
      toast.error('Erreur lors de la soumission de l\'exercice');
    },
  });
};
