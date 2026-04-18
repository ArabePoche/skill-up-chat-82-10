// Calcule des metriques exactes de formation a partir des inscriptions et evaluations reelles.
import { supabase } from '@/integrations/supabase/client';

type FormationLike = {
  id: string;
  students_count?: number | null;
  rating?: number | null;
  reviews_count?: number | null;
};

export const enrichFormationsWithMetrics = async <T extends FormationLike>(
  formations: T[]
): Promise<Array<T & { students_count: number; rating: number; reviews_count: number }>> => {
  if (!formations.length) {
    return [];
  }

  const formationIds = formations.map((formation) => formation.id);

  const [{ data: enrollments, error: enrollmentsError }, { data: evaluations, error: evaluationsError }] = await Promise.all([
    supabase
      .from('enrollment_requests')
      .select('formation_id, user_id')
      .in('formation_id', formationIds)
      .eq('status', 'approved'),
    supabase
      .from('interview_evaluations')
      .select('formation_id, teacher_rating, feedback_text, responded_at')
      .in('formation_id', formationIds),
  ]);

  if (enrollmentsError) {
    throw enrollmentsError;
  }

  if (evaluationsError) {
    throw evaluationsError;
  }

  const studentsByFormation = new Map<string, Set<string>>();
  for (const enrollment of enrollments || []) {
    const currentStudents = studentsByFormation.get(enrollment.formation_id) || new Set<string>();
    currentStudents.add(enrollment.user_id);
    studentsByFormation.set(enrollment.formation_id, currentStudents);
  }

  const ratingStatsByFormation = new Map<
    string,
    { ratingSum: number; ratingCount: number; reviewsCount: number }
  >();

  for (const evaluation of evaluations || []) {
    const currentStats = ratingStatsByFormation.get(evaluation.formation_id) || {
      ratingSum: 0,
      ratingCount: 0,
      reviewsCount: 0,
    };

    const hasReview = !!evaluation.responded_at && (!!evaluation.feedback_text?.trim() || evaluation.teacher_rating !== null);

    if (evaluation.teacher_rating !== null) {
      currentStats.ratingSum += evaluation.teacher_rating;
      currentStats.ratingCount += 1;
    }

    if (hasReview) {
      currentStats.reviewsCount += 1;
    }

    ratingStatsByFormation.set(evaluation.formation_id, currentStats);
  }

  return formations.map((formation) => {
    const studentsCount = studentsByFormation.get(formation.id)?.size ?? formation.students_count ?? 0;
    const ratingStats = ratingStatsByFormation.get(formation.id);
    const rating = ratingStats?.ratingCount
      ? Number((ratingStats.ratingSum / ratingStats.ratingCount).toFixed(1))
      : formation.rating ?? 0;
    const reviewsCount = ratingStats?.reviewsCount ?? formation.reviews_count ?? 0;

    return {
      ...formation,
      students_count: studentsCount,
      rating,
      reviews_count: reviewsCount,
    };
  });
};