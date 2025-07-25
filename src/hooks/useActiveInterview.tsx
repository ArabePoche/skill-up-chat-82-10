
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export const useActiveInterview = (
  lessonId: string,
  formationId: string,
  studentId: string
) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['active-interview', lessonId, formationId, studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('active_interviews')
        .select(`
          *,
          teacher:teachers(
            id,
            user_id,
            profiles:user_id(
              first_name,
              last_name,
              username
            )
          )
        `)
        .eq('lesson_id', lessonId)
        .eq('formation_id', formationId)
        .eq('student_id', studentId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Error fetching active interview:', error);
        return null;
      }

      return data;
    },
    enabled: !!lessonId && !!formationId && !!studentId,
    refetchInterval: 5000,
  });
};

export const useStartInterview = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      lessonId,
      formationId,
      studentId,
    }: {
      lessonId: string;
      formationId: string;
      studentId: string;
    }) => {
      if (!user?.id) {
        throw new Error('Utilisateur non authentifié');
      }

      // Vérifier que l'utilisateur est bien un enseignant avec teacher_formations
      const { data: teacherData, error: teacherError } = await supabase
        .from('teachers')
        .select(`
          id, 
          user_id,
          teacher_formations!inner(
            formation_id
          )
        `)
        .eq('user_id', user.id)
        .eq('teacher_formations.formation_id', formationId)
        .single();

      if (teacherError || !teacherData) {
        console.error('Teacher verification error:', teacherError);
        throw new Error('Vous n\'êtes pas autorisé à démarrer un entretien pour cette formation');
      }

      // Vérifier que l'étudiant existe
      const { data: studentData, error: studentError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('id', studentId)
        .single();

      if (studentError || !studentData) {
        console.error('Student verification error:', studentError);
        throw new Error('Étudiant introuvable');
      }

      // Vérifier que la leçon et la formation existent
      const { data: lessonData, error: lessonError } = await supabase
        .from('lessons')
        .select('id, title, level_id')
        .eq('id', lessonId)
        .single();

      if (lessonError || !lessonData) {
        console.error('Lesson verification error:', lessonError);
        throw new Error('Leçon introuvable');
      }

      const { data: formationData, error: formationError } = await supabase
        .from('formations')
        .select('id, title')
        .eq('id', formationId)
        .single();

      if (formationError || !formationData) {
        console.error('Formation verification error:', formationError);
        throw new Error('Formation introuvable');
      }

      console.log('Starting interview with verified data:', {
        teacher_id: teacherData.id,
        student_id: studentId,
        lesson_id: lessonId,
        formation_id: formationId,
        studentName: `${studentData.first_name} ${studentData.last_name}`,
        lessonTitle: lessonData.title,
        formationTitle: formationData.title
      });

      // Créer l'entretien avec teacher.id
      const { data, error } = await supabase
        .from('active_interviews')
        .insert({
          teacher_id: teacherData.id,
          student_id: studentId,
          lesson_id: lessonId,
          formation_id: formationId,
          is_active: true,
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error starting interview:', error);
        
        if (error.code === '23503') {
          throw new Error('Erreur de relation : un des identifiants fournis est invalide');
        } else if (error.code === '23505') {
          throw new Error('Un entretien est déjà en cours pour cette leçon');
        } else {
          throw new Error(`Erreur lors du démarrage de l'entretien: ${error.message}`);
        }
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['active-interview', data.lesson_id, data.formation_id, data.student_id]
      });
      toast.success('Entretien démarré avec succès! 🎉');
    },
    onError: (error: Error) => {
      console.error('Interview start error:', error);
      toast.error(error.message);
    }
  });
};

export const useEndInterview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      lessonId,
      formationId,
      studentId,
      teacherId
    }: {
      lessonId: string;
      formationId: string;
      studentId: string;
      teacherId: string;
    }) => {
      try {
        // 1. Marquer l'entretien comme terminé et récupérer l'ID de la session
        // Utiliser order by et limit pour éviter l'erreur multiple rows
        const { data: sessions, error: fetchError } = await supabase
          .from('active_interviews')
          .select()
          .eq('teacher_id', teacherId)
          .eq('student_id', studentId)
          .eq('lesson_id', lessonId)
          .eq('formation_id', formationId)
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (fetchError) {
          console.error('Error fetching interview sessions:', fetchError);
          throw new Error(`Erreur lors de la récupération de l'entretien: ${fetchError.message}`);
        }

        if (!sessions || sessions.length === 0) {
          throw new Error('Aucun entretien actif trouvé');
        }

        // Prendre la session la plus récente
        const sessionToEnd = sessions[0];
        console.log('Ending interview session:', sessionToEnd.id);

        const { data: updatedSession, error: sessionError } = await supabase
          .from('active_interviews')
          .update({ 
            is_active: false,
            ended_at: new Date().toISOString()
          })
          .eq('id', sessionToEnd.id)
          .select()
          .single();

        if (sessionError || !updatedSession) {
          console.error('Error ending interview session:', sessionError);
          throw new Error(`Erreur lors de la fin de l'entretien: ${sessionError?.message}`);
        }

        // Si il y a d'autres sessions actives pour les mêmes paramètres, les fermer aussi
        if (sessions.length > 1) {
          const otherSessionIds = sessions.slice(1).map(s => s.id);
          console.log('Closing additional sessions:', otherSessionIds);
          
          await supabase
            .from('active_interviews')
            .update({ 
              is_active: false,
              ended_at: new Date().toISOString()
            })
            .in('id', otherSessionIds);
        }

        // 2. Créer l'évaluation d'entretien (expire dans 24h) avec le lien vers la session
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        const { data: evaluation, error: evalError } = await supabase
          .from('interview_evaluations')
          .insert({
            student_id: studentId,
            teacher_id: teacherId,
            lesson_id: lessonId,
            formation_id: formationId,
            interview_session_id: updatedSession.id,
            expires_at: expiresAt.toISOString()
          })
          .select()
          .single();

        if (evalError) {
          console.error('Error creating evaluation:', evalError);
          throw new Error(`Erreur lors de la création de l'évaluation: ${evalError.message}`);
        }

        // 3. Envoyer le message système avec l'enquête
        const SYSTEM_USER_ID = '4c32c988-3b19-4eca-87cb-0e0595fd7fbb';
        
        const { error: messageError } = await supabase
          .from('lesson_messages')
          .insert({
            lesson_id: lessonId,
            formation_id: formationId,
            sender_id: SYSTEM_USER_ID,
            receiver_id: studentId,
            content: `🎯 Entretien terminé avec votre professeur.\n\n📋 Une enquête de satisfaction vous a été envoyée. Votre avis nous aide à améliorer nos services.\n\n⏰ Vous avez 24h pour répondre. Passé ce délai, nous considérerons que vous êtes satisfait de cet entretien.`,
            message_type: 'system',
            is_system_message: true
          });

        if (messageError) {
          console.warn('Error sending evaluation message:', messageError);
        }

        return evaluation;
      } catch (error) {
        console.error('End interview error:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['active-interview']
      });
      toast.success('Entretien terminé avec succès! 🎉');
      toast.info('L\'enquête de satisfaction a été envoyée à l\'élève');
    },
    onError: (error: Error) => {
      console.error('Interview end error:', error);
      toast.error(error.message);
    }
  });
};
