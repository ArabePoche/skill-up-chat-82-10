/**
 * Hook pour récupérer les vidéos (lessons) likées par l'utilisateur
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useUserLikedVideos = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['user-liked-videos', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('lesson_video_likes')
        .select('lesson_id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (!data || data.length === 0) return [];
      
      const lessonIds = data.map(like => like.lesson_id);
      
      // 1) Récupérer les lessons simples
      const { data: lessons, error: lessonsError } = await supabase
        .from('lessons')
        .select('id, title, description, video_url, duration, level_id')
        .in('id', lessonIds);
      if (lessonsError) throw lessonsError;
      if (!lessons || lessons.length === 0) return [];

      // 2) Récupérer les levels
      const levelIds = [...new Set(lessons.map(l => l.level_id).filter(Boolean))];
      const { data: levels, error: levelsError } = await supabase
        .from('levels')
        .select('id, title, formation_id')
        .in('id', levelIds);
      if (levelsError) throw levelsError;

      // 3) Récupérer les formations
      const formationIds = [...new Set((levels || []).map(l => l.formation_id).filter(Boolean))];
      const { data: formations, error: formationsError } = await supabase
        .from('formations')
        .select('id, title, thumbnail_url')
        .in('id', formationIds);
      if (formationsError) throw formationsError;

      // 4) Assembler la structure attendue (levels { formations { ... } })
      const assemble = lessons.map((lesson: any) => {
        const level = levels?.find((lv: any) => lv.id === lesson.level_id);
        const formation = level ? formations?.find((f: any) => f.id === level.formation_id) : null;
        return {
          id: lesson.id,
          title: lesson.title,
          description: lesson.description,
          video_url: lesson.video_url,
          duration: lesson.duration,
          levels: level ? {
            id: level.id,
            title: level.title,
            formation_id: level.formation_id,
            formations: formation ? {
              id: formation.id,
              title: formation.title,
              thumbnail_url: formation.thumbnail_url,
            } : null,
          } : null,
        };
      });

      return assemble;
    },
    enabled: !!userId,
  });
};
