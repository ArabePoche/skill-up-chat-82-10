// Hook pour le passage de fin d'année (promotion en masse)
// L'administration définit une moyenne minimale ; les élèves au-dessus passent
// dans la classe cible mappée, ceux en-dessous redoublent.
import { useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useOfflineQuery } from '@/offline/hooks/useOfflineQuery';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type PromotionAction = 'promote' | 'redouble' | 'skip';

export interface ClassPromotionMap {
  // source_class_id -> { pass_target_class_id (année cible), fail_target_class_id }
  [sourceClassId: string]: {
    passTargetClassId: string | null;
    failTargetClassId: string | null;
  };
}

export interface PromotionPreviewRow {
  studentId: string;
  firstName: string;
  lastName: string;
  studentCode: string | null;
  sourceClassId: string | null;
  sourceClassName: string | null;
  annualAverage: number | null;
  reportCardCount: number;
  suggestedAction: PromotionAction;
  targetClassId: string | null;
}

export interface ApplyPromotionEntry {
  studentId: string;
  action: PromotionAction;
  targetClassId: string | null;
}

/**
 * Récupère les élèves de l'année source et calcule leur moyenne annuelle
 * (moyenne des general_average dans school_report_card_history pour cette année).
 */
export const usePromotionStudents = (
  schoolId: string | undefined,
  sourceYearId: string | undefined,
) => {
  return useOfflineQuery({
    queryKey: ['promotion-students', schoolId, sourceYearId],
    queryFn: async () => {
      if (!schoolId || !sourceYearId) return [];

      // 1. Élèves actifs de l'année source
      const { data: students, error: stuErr } = await supabase
        .from('students_school')
        .select('id, first_name, last_name, student_code, class_id, status, classes(name, cycle)')
        .eq('school_id', schoolId)
        .eq('school_year_id', sourceYearId)
        .eq('status', 'active')
        .order('last_name', { ascending: true });

      if (stuErr) throw stuErr;
      if (!students || students.length === 0) return [];

      // 2. Bulletins (report card history) de l'année source pour ces élèves
      const studentIds = students.map((s: any) => s.id);
      const { data: cards, error: cardErr } = await supabase
        .from('school_report_card_history')
        .select('student_id, general_average')
        .eq('school_id', schoolId)
        .eq('school_year_id', sourceYearId)
        .in('student_id', studentIds);

      if (cardErr) throw cardErr;

      // 3. Calculer la moyenne annuelle (moyenne des bulletins)
      const avgMap = new Map<string, { sum: number; count: number }>();
      for (const c of cards || []) {
        const v = (c as any).general_average;
        if (v == null) continue;
        const num = typeof v === 'string' ? parseFloat(v) : Number(v);
        if (!Number.isFinite(num)) continue;
        const cur = avgMap.get((c as any).student_id) || { sum: 0, count: 0 };
        cur.sum += num;
        cur.count += 1;
        avgMap.set((c as any).student_id, cur);
      }

      return students.map((s: any) => {
        const agg = avgMap.get(s.id);
        return {
          studentId: s.id,
          firstName: s.first_name,
          lastName: s.last_name,
          studentCode: s.student_code,
          sourceClassId: s.class_id,
          sourceClassName: s.classes?.name || null,
          annualAverage: agg && agg.count > 0 ? agg.sum / agg.count : null,
          reportCardCount: agg?.count || 0,
        };
      });
    },
    enabled: !!schoolId && !!sourceYearId,
  });
};

/**
 * Construit la liste de prévisualisation à partir des élèves, du seuil et du mapping.
 * Pure function utilitaire (pas de hook).
 */
export const buildPromotionPreview = (
  rawStudents: Array<{
    studentId: string;
    firstName: string;
    lastName: string;
    studentCode: string | null;
    sourceClassId: string | null;
    sourceClassName: string | null;
    annualAverage: number | null;
    reportCardCount: number;
  }>,
  classMap: ClassPromotionMap,
  threshold: number,
  overrides: Record<string, { action?: PromotionAction; targetClassId?: string | null }> = {},
): PromotionPreviewRow[] => {
  return rawStudents.map((s) => {
    const mapping = s.sourceClassId ? classMap[s.sourceClassId] : null;
    const passes = s.annualAverage != null && s.annualAverage >= threshold;

    let suggestedAction: PromotionAction;
    let targetClassId: string | null;

    if (s.annualAverage == null) {
      // Pas de bulletin : à décider manuellement -> redouble par défaut
      suggestedAction = 'redouble';
      targetClassId = mapping?.failTargetClassId ?? null;
    } else if (passes) {
      suggestedAction = 'promote';
      targetClassId = mapping?.passTargetClassId ?? null;
    } else {
      suggestedAction = 'redouble';
      targetClassId = mapping?.failTargetClassId ?? null;
    }

    const ov = overrides[s.studentId];
    if (ov?.action) suggestedAction = ov.action;
    if (ov?.targetClassId !== undefined) targetClassId = ov.targetClassId;

    return {
      ...s,
      suggestedAction,
      targetClassId,
    };
  });
};

/**
 * Applique le passage : insère un nouveau record students_school dans l'année cible
 * pour chaque élève marqué promote/redouble.
 * - 'skip' : aucun enregistrement créé.
 * - Évite les doublons : ignore si l'élève a déjà un enregistrement dans l'année cible.
 */
export const useApplyPromotion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      schoolId: string;
      sourceYearId: string;
      targetYearId: string;
      entries: ApplyPromotionEntry[];
    }) => {
      const { schoolId, sourceYearId, targetYearId, entries } = params;

      const toProcess = entries.filter((e) => e.action !== 'skip' && e.targetClassId);
      if (toProcess.length === 0) {
        return { created: 0, skipped: entries.length };
      }

      const sourceIds = toProcess.map((e) => e.studentId);

      // Récupérer les données complètes des élèves source (pour copier les infos perso)
      const { data: sourceStudents, error: srcErr } = await supabase
        .from('students_school')
        .select('*')
        .in('id', sourceIds);

      if (srcErr) throw srcErr;

      // Vérifier les élèves déjà inscrits dans l'année cible
      const { data: existingTarget, error: exErr } = await supabase
        .from('students_school')
        .select('student_code')
        .eq('school_id', schoolId)
        .eq('school_year_id', targetYearId)
        .in(
          'student_code',
          (sourceStudents || []).map((s: any) => s.student_code).filter(Boolean) as string[],
        );

      if (exErr) throw exErr;

      const existingCodes = new Set((existingTarget || []).map((s: any) => s.student_code));

      // Construire les nouveaux records
      const newRows: any[] = [];
      let skipped = 0;

      for (const entry of toProcess) {
        const src = (sourceStudents || []).find((s: any) => s.id === entry.studentId);
        if (!src) {
          skipped++;
          continue;
        }
        if (src.student_code && existingCodes.has(src.student_code)) {
          // Déjà inscrit dans l'année cible : on saute
          skipped++;
          continue;
        }
        newRows.push({
          school_id: schoolId,
          school_year_id: targetYearId,
          class_id: entry.targetClassId,
          family_id: src.family_id,
          first_name: src.first_name,
          last_name: src.last_name,
          date_of_birth: src.date_of_birth,
          gender: src.gender,
          student_code: src.student_code,
          photo_url: src.photo_url,
          parent_name: src.parent_name,
          parent_phone: src.parent_phone,
          parent_email: src.parent_email,
          address: src.address,
          city: src.city,
          medical_notes: src.medical_notes,
          status: 'active',
          discount_percentage: src.discount_percentage,
          discount_amount: src.discount_amount,
        });
      }

      let created = 0;
      if (newRows.length > 0) {
        const { data, error } = await supabase
          .from('students_school')
          .insert(newRows)
          .select('id');
        if (error) throw error;
        created = data?.length || 0;
      }

      // Trace dans student_decisions (best-effort)
      try {
        const decisionRows = toProcess
          .map((e) => {
            const src = (sourceStudents || []).find((s: any) => s.id === e.studentId);
            if (!src) return null;
            return {
              student_id: e.studentId,
              decision_type: e.action === 'promote' ? 'promotion' : 'demotion',
              previous_class_id: src.class_id,
              target_class_id: e.targetClassId,
              comment: `Passage de fin d'année (auto) — année ${sourceYearId} → ${targetYearId}`,
            };
          })
          .filter(Boolean);
        if (decisionRows.length > 0) {
          await supabase.from('student_decisions' as any).insert(decisionRows as any);
        }
      } catch (e) {
        // table optionnelle
      }

      return { created, skipped };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['school-students-payments'] });
      queryClient.invalidateQueries({ queryKey: ['promotion-students'] });
      toast.success(
        `Passage appliqué : ${result.created} élève(s) inscrit(s) dans la nouvelle année${
          result.skipped > 0 ? `, ${result.skipped} ignoré(s)` : ''
        }.`,
      );
    },
    onError: (err: any) => {
      console.error('Erreur passage de fin d\'année:', err);
      toast.error('Erreur lors du passage : ' + (err?.message || 'inconnue'));
    },
  });
};
