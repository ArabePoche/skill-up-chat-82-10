/**
 * Hook pour soumettre un exercice dans le contexte du chat de groupe
 * Adapté pour la logique basée sur le niveau (level) plutôt que sur une leçon unique
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { fileStore } from '@/file-manager/stores/FileStore';

export const useSubmitGroupExercise = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      exerciseId,
      content,
      files,
      formationId,
      levelId
    }: {
      exerciseId: string;
      content: string;
      files?: File[];
      formationId: string;
      levelId: string;
    }) => {
      if (!user?.id) {
        throw new Error('Utilisateur non authentifié');
      }

      const uploadedFiles: Array<{ url: string; name: string; type: string }> = [];

      // Upload de tous les fichiers
      if (files && files.length > 0) {
        console.log('Uploading group exercise files:', files.length);
        
        for (const file of files) {
          const fileExt = file.name.split('.').pop();
          const filePath = `${user.id}/${levelId}/${exerciseId}/${Date.now()}_${file.name}`;
          
          const { error: uploadError } = await supabase.storage
            .from('students_exercises_submission_files')
            .upload(filePath, file);

          if (uploadError) {
            console.error('Error uploading group exercise file:', uploadError);
            throw uploadError;
          }

          const { data: { publicUrl } } = supabase.storage
            .from('students_exercises_submission_files')
            .getPublicUrl(filePath);

          uploadedFiles.push({
            url: publicUrl,
            name: file.name,
            type: file.type
          });

          // ✅ Sauvegarder immédiatement dans le cache local (FileStore)
          // L'élève verra directement son fichier sans bouton "Télécharger"
          try {
            const blob = new Blob([await file.arrayBuffer()], { type: file.type });
            await fileStore.saveFile(publicUrl, blob, {
              remoteUrl: publicUrl,
              fileName: file.name,
              fileType: file.type,
              fileSize: file.size,
              ownerId: user.id,
              isOwnFile: true,
            });
            console.log('💾 Fichier exercice groupe sauvegardé localement (élève):', file.name);
          } catch (cacheError) {
            // Ne pas bloquer la soumission si le cache échoue
            console.warn('⚠️ Impossible de sauvegarder dans le cache local:', cacheError);
          }
        }
        
        console.log('Group exercise files uploaded successfully:', uploadedFiles);
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

      // Créer un message pour chaque fichier + un message texte SEULEMENT si fourni
      const messages = [];
      
      // Message texte UNIQUEMENT si du contenu est fourni (pas de texte par défaut)
      if (content && content.trim().length > 0) {
        messages.push({
          lesson_id: lessonId,
          formation_id: formationId,
          sender_id: user.id,
          content: content.trim(),
          message_type: 'text',
          is_exercise_submission: true,
          exercise_status: null,
          exercise_id: exerciseId,
          promotion_id: studentPromotion?.promotion_id,
          level_id: levelId
        });
      }

      // Un message par fichier
      for (const file of uploadedFiles) {
        messages.push({
          lesson_id: lessonId,
          formation_id: formationId,
          sender_id: user.id,
          content: `Fichier: ${file.name}`,
          message_type: 'file',
          file_url: file.url,
          file_type: file.type,
          file_name: file.name,
          is_exercise_submission: true,
          exercise_status: null,
          exercise_id: exerciseId,
          promotion_id: studentPromotion?.promotion_id,
          level_id: levelId
        });
      }

      const { data, error } = await supabase
        .from('lesson_messages')
        .insert(messages)
        .select();

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
      
      console.log('Group exercise submitted with', messages.length, 'messages');
      return data?.[0] || data;
    },
    onSuccess: () => {
      // Invalider toutes les clés possibles pour les messages de groupe
      queryClient.invalidateQueries({ 
        queryKey: ['group-chat-messages'] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['promotion-messages'] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['level-exercises'] 
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