import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UserProgress {
  userId: string;
  formationId: string;
  currentLevelOrder: number;
  currentLessonOrder: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      'https://jiasafdbfqqhhdazoybu.supabase.co',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log('Starting weekly lesson unlock process...');

    // Récupérer tous les utilisateurs inscrits au plan gratuit (approuvés)
    const { data: freeUsers, error: usersError } = await supabase
      .from('enrollment_requests')
      .select('user_id, formation_id')
      .eq('status', 'approved')
      .eq('plan_type', 'free');

    if (usersError) {
      console.error('Error fetching free users:', usersError);
      throw usersError;
    }

    console.log(`Found ${freeUsers?.length || 0} free plan enrollments`);

    let unlockedCount = 0;
    let errorCount = 0;

    for (const enrollment of freeUsers || []) {
      try {
        // Récupérer la progression maximale de l'utilisateur
        const { data: progressData, error: progressError } = await supabase
          .from('user_lesson_progress')
          .select(`
            lesson_id,
            lessons!inner (
              id,
              order_index,
              level_id,
              levels!inner (
                order_index,
                formation_id
              )
            )
          `)
          .eq('user_id', enrollment.user_id)
          .eq('lessons.levels.formation_id', enrollment.formation_id)
          .order('lessons.levels.order_index', { ascending: false })
          .order('lessons.order_index', { ascending: false })
          .limit(1);

        if (progressError) {
          console.error(`Error fetching progress for user ${enrollment.user_id}:`, progressError);
          errorCount++;
          continue;
        }

        let nextLevelOrder = 0;
        let nextLessonOrder = 0;

        if (progressData && progressData.length > 0) {
          const current = progressData[0] as any;
          nextLevelOrder = current.lessons.levels.order_index;
          nextLessonOrder = current.lessons.order_index + 1;
        }

        // Trouver la leçon suivante
        const { data: nextLesson, error: nextLessonError } = await supabase
          .from('lessons')
          .select(`
            id,
            order_index,
            levels!inner (
              order_index,
              formation_id
            )
          `)
          .eq('levels.formation_id', enrollment.formation_id)
          .or(`levels.order_index.eq.${nextLevelOrder},levels.order_index.eq.${nextLevelOrder + 1}`)
          .order('levels.order_index', { ascending: true })
          .order('order_index', { ascending: true });

        if (nextLessonError) {
          console.error(`Error fetching next lesson for user ${enrollment.user_id}:`, nextLessonError);
          errorCount++;
          continue;
        }

        // Trouver la bonne leçon suivante
        let lessonToUnlock = null;
        for (const lesson of (nextLesson || []) as any[]) {
          const levelOrder = lesson.levels.order_index;
          const lessonOrder = lesson.order_index;

          if (levelOrder === nextLevelOrder && lessonOrder === nextLessonOrder) {
            lessonToUnlock = lesson;
            break;
          } else if (levelOrder === nextLevelOrder + 1 && lessonOrder === 0) {
            lessonToUnlock = lesson;
            break;
          }
        }

        if (!lessonToUnlock) {
          console.log(`No next lesson found for user ${enrollment.user_id} in formation ${enrollment.formation_id}`);
          continue;
        }

        // Vérifier si la leçon n'est pas déjà débloquée
        const { data: existing, error: existingError } = await supabase
          .from('user_lesson_progress')
          .select('id')
          .eq('user_id', enrollment.user_id)
          .eq('lesson_id', lessonToUnlock.id)
          .single();

        if (existing) {
          console.log(`Lesson ${lessonToUnlock.id} already unlocked for user ${enrollment.user_id}`);
          continue;
        }

        // Insérer la nouvelle leçon débloquée
        const { error: insertError } = await supabase
          .from('user_lesson_progress')
          .insert({
            user_id: enrollment.user_id,
            lesson_id: lessonToUnlock.id,
            status: 'not_started',
            exercise_completed: false
          });

        if (insertError) {
          console.error(`Error unlocking lesson for user ${enrollment.user_id}:`, insertError);
          errorCount++;
          continue;
        }

        console.log(`Successfully unlocked lesson ${lessonToUnlock.id} for user ${enrollment.user_id}`);
        unlockedCount++;

      } catch (userError) {
        console.error(`Error processing user ${enrollment.user_id}:`, userError);
        errorCount++;
      }
    }

    const result = {
      success: true,
      message: `Weekly unlock complete: ${unlockedCount} lessons unlocked, ${errorCount} errors`,
      unlockedCount,
      errorCount,
      totalProcessed: freeUsers?.length || 0
    };

    console.log('Unlock process completed:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Fatal error in unlock process:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: (error as Error).message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
