/**
 * Modal de création/édition de formation pour les créateurs
 * - Détecte et charge automatiquement un brouillon existant à l'ouverture
 * - Permet la sauvegarde en brouillon sans acceptation des conditions
 * - Soumet aux administrateurs une fois les conditions acceptées
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, BookOpen, Loader2, Save, Send, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import DynamicFormationForm from '@/components/admin/DynamicFormationForm';

interface ExerciseData {
  id?: string;
  title: string;
  description: string;
  type: string;
  content: string;
  uploadedFiles?: Array<{ url: string; type: string }>;
}

interface LessonData {
  id?: string;
  title: string;
  description: string;
  videoUrl: string;
  duration: string;
  orderIndex: number;
  exercises: ExerciseData[];
}

interface LevelData {
  id?: string;
  title: string;
  description: string;
  orderIndex: number;
  lessons: LessonData[];
}

interface FormationData {
  title: string;
  description: string;
  badge: string;
  duration: number;
  price: number;
  originalPrice?: number;
  promoVideoUrl?: string;
  thumbnailUrl?: string;
  isActive: boolean;
  acceptedPaymentMethods: string[];
  levels: LevelData[];
}

interface CommissionSetting {
  commission_type: string;
  commission_rate: number;
}

interface CreatorFormationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  authorId: string;
  onSuccess?: () => void;
}

const CreatorFormationModal: React.FC<CreatorFormationModalProps> = ({
  open,
  onOpenChange,
  authorId,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const formDataRef = useRef<FormationData | null>(null);

  const [readTerms, setReadTerms] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [draftInitialData, setDraftInitialData] = useState<FormationData | null>(null);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Commission settings
  const { data: commissionSettings } = useQuery({
    queryKey: ['formation-commission-settings'],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('formation_commission_settings')
        .select('*')
        .eq('is_active', true)
        .order('commission_rate', { ascending: false });
      if (error) throw error;
      return (data || []) as CommissionSetting[];
    },
  });

  const formatFormationData = (raw: Record<string, unknown>): FormationData => ({
    title: (raw.title as string) || '',
    description: (raw.description as string) || '',
    badge: (raw.badge as string) || '',
    duration: (raw.duration as number) || 0,
    price: (raw.price as number) || 0,
    originalPrice: raw.original_price as number | undefined,
    promoVideoUrl: raw.promo_video_url as string | undefined,
    thumbnailUrl: raw.thumbnail_url as string | undefined,
    isActive: raw.is_active as boolean,
    acceptedPaymentMethods: (raw.accepted_payment_methods as string[]) || [],
    levels: ((raw.levels as Record<string, unknown>[]) || [])
      .sort((a, b) => (a.order_index as number) - (b.order_index as number))
      .map((level) => ({
        id: level.id as string,
        title: level.title as string,
        description: (level.description as string) || '',
        orderIndex: level.order_index as number,
        lessons: ((level.lessons as Record<string, unknown>[]) || [])
          .sort((a, b) => (a.order_index as number) - (b.order_index as number))
          .map((lesson) => ({
            id: lesson.id as string,
            title: lesson.title as string,
            description: (lesson.description as string) || '',
            videoUrl: (lesson.video_url as string) || '',
            duration: (lesson.duration as string) || '',
            orderIndex: lesson.order_index as number,
            exercises: ((lesson.exercises as Record<string, unknown>[]) || []).map((exercise) => ({
              id: exercise.id as string,
              title: exercise.title as string,
              description: (exercise.description as string) || '',
              type: (exercise.type as string) || '',
              content: (exercise.content as string) || '',
              uploadedFiles: ((exercise.exercise_files as Record<string, unknown>[]) || []).map(
                (file) => ({ url: file.file_url as string, type: file.file_type as string })
              ),
            })),
          })),
      })),
  });

  const loadDraft = useCallback(async () => {
    setLoadingDraft(true);
    try {
      const { data, error } = await supabase
        .from('formations')
        .select(
          `*,
          levels (
            *,
            lessons (
              *,
              exercises!exercises_lesson_id_fkey (
                *,
                exercise_files (*)
              )
            )
          )`
        )
        .eq('author_id', authorId)
        .eq('approval_status', 'draft')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setDraftId(data.id);
        setDraftInitialData(formatFormationData(data as unknown as Record<string, unknown>));
        toast.info('Brouillon chargé — continuez votre configuration.');
      } else {
        setDraftId(null);
        setDraftInitialData(null);
      }
    } catch (error) {
      console.error('Error loading draft:', error);
    } finally {
      setLoadingDraft(false);
    }
  }, [authorId]);

  // Load draft when modal opens
  useEffect(() => {
    if (open) {
      setReadTerms(false);
      setAcceptTerms(false);
      loadDraft();
    }
  }, [open, loadDraft]);

  const createLevels = async (formationId: string, levels: LevelData[]) => {
    for (const levelData of levels) {
      const levelId = crypto.randomUUID();
      const { error: levelError } = await supabase.from('levels').insert({
        id: levelId,
        formation_id: formationId,
        title: levelData.title,
        description: levelData.description,
        order_index: levelData.orderIndex,
      });
      if (levelError) throw levelError;

      const sortedLessons = [...(levelData.lessons || [])].sort(
        (a, b) => a.orderIndex - b.orderIndex
      );
      for (const lessonData of sortedLessons) {
        const lessonId = crypto.randomUUID();
        const { error: lessonError } = await supabase.from('lessons').insert({
          id: lessonId,
          level_id: levelId,
          title: lessonData.title,
          description: lessonData.description,
          video_url: lessonData.videoUrl,
          duration: lessonData.duration,
          order_index: lessonData.orderIndex,
          reference_id: crypto.randomUUID(),
        });
        if (lessonError) throw lessonError;

        for (const exerciseData of lessonData.exercises || []) {
          const exerciseId = crypto.randomUUID();
          const { error: exerciseError } = await supabase.from('exercises').insert({
            id: exerciseId,
            lesson_id: lessonId,
            title: exerciseData.title,
            description: exerciseData.description,
            type: exerciseData.type,
            content: exerciseData.content,
          });
          if (exerciseError) throw exerciseError;

          if (exerciseData.uploadedFiles && exerciseData.uploadedFiles.length > 0) {
            const fileInserts = exerciseData.uploadedFiles.map((file) => ({
              id: crypto.randomUUID(),
              exercise_id: exerciseId,
              file_url: file.url,
              file_type: file.type,
            }));
            const { error: filesError } = await supabase
              .from('exercise_files')
              .insert(fileInserts);
            if (filesError) throw filesError;
          }
        }
      }
    }
  };

  const createFormationRecord = async (
    data: FormationData,
    approvalStatus: 'draft' | 'pending'
  ): Promise<string> => {
    const formationId = crypto.randomUUID();
    const insertData: Record<string, unknown> = {
      id: formationId,
      title: data.title,
      description: data.description,
      badge: data.badge,
      duration: data.duration,
      price: data.price,
      original_price: data.originalPrice,
      promo_video_url: data.promoVideoUrl,
      thumbnail_url: data.thumbnailUrl,
      is_active: false,
      accepted_payment_methods: data.acceptedPaymentMethods || [],
      author_id: authorId,
      approval_status: approvalStatus,
    };
    if (approvalStatus === 'pending') {
      insertData.terms_accepted = true;
      insertData.submitted_at = new Date().toISOString();
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase.from('formations').insert(insertData as any);
    if (error) throw error;
    await createLevels(formationId, data.levels);
    return formationId;
  };

  const updateFormationRecord = async (
    id: string,
    data: FormationData,
    approvalStatus?: 'draft' | 'pending'
  ) => {
    const updateData: Record<string, unknown> = {
      title: data.title,
      description: data.description,
      badge: data.badge,
      duration: data.duration,
      price: data.price,
      original_price: data.originalPrice,
      promo_video_url: data.promoVideoUrl,
      thumbnail_url: data.thumbnailUrl,
      accepted_payment_methods: data.acceptedPaymentMethods || [],
    };
    if (approvalStatus) {
      updateData.approval_status = approvalStatus;
      if (approvalStatus === 'pending') {
        updateData.terms_accepted = true;
        updateData.submitted_at = new Date().toISOString();
      }
    }
    const { error: updateError } = await supabase
      .from('formations')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update(updateData as any)
      .eq('id', id);
    if (updateError) throw updateError;

    // Delete and re-create levels to keep draft in sync
    const { error: deleteError } = await supabase
      .from('levels')
      .delete()
      .eq('formation_id', id);
    if (deleteError) throw deleteError;

    await createLevels(id, data.levels);
  };

  const handleSaveDraft = async () => {
    const data = formDataRef.current;
    if (!data?.title?.trim()) {
      toast.error('Le titre de la formation est requis pour enregistrer le brouillon');
      return;
    }
    setSavingDraft(true);
    try {
      if (draftId) {
        await updateFormationRecord(draftId, data);
        toast.success('Brouillon mis à jour avec succès');
      } else {
        const newId = await createFormationRecord(data, 'draft');
        setDraftId(newId);
        toast.success('Formation enregistrée en brouillon — vous pouvez y revenir ultérieurement');
      }
      queryClient.invalidateQueries({ queryKey: ['admin-formations', authorId] });
    } catch (error) {
      const err = error as Error;
      console.error('Error saving draft:', err);
      toast.error('Erreur lors de la sauvegarde : ' + (err.message || ''));
    } finally {
      setSavingDraft(false);
    }
  };

  // Called by DynamicFormationForm's form submit (Submit to Admins button)
  const handleSubmitToAdmins = async (data: FormationData) => {
    if (!readTerms || !acceptTerms) {
      toast.error('Vous devez lire et accepter les conditions avant de soumettre');
      return;
    }
    setSubmitting(true);
    try {
      if (draftId) {
        await updateFormationRecord(draftId, data, 'pending');
      } else {
        await createFormationRecord(data, 'pending');
      }
      queryClient.invalidateQueries({ queryKey: ['admin-formations', authorId] });
      toast.success('Formation soumise pour approbation ! Un administrateur la validera bientôt.');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      const err = error as Error;
      console.error('Error submitting formation:', err);
      toast.error('Erreur lors de la soumission : ' + (err.message || ''));
    } finally {
      setSubmitting(false);
    }
  };

  const catalogueRate =
    commissionSettings?.find((c: CommissionSetting) => c.commission_type === 'catalogue')?.commission_rate || 35;
  const creatorRate =
    commissionSettings?.find((c: CommissionSetting) => c.commission_type === 'creator_channel')
      ?.commission_rate || 10;
  const boostRate =
    commissionSettings?.find((c: CommissionSetting) => c.commission_type === 'boost')?.commission_rate || 20;

  const customSubmitSection = (
    <div className="space-y-4 border-t pt-6 mt-2">
      {/* Terms and Commissions */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
        <h4 className="font-semibold text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Conditions et Commissions
        </h4>
        <div className="text-xs text-muted-foreground space-y-2">
          <p className="font-medium text-foreground">
            En publiant votre formation sur notre plateforme, vous acceptez les conditions suivantes :
          </p>
          <ul className="list-disc pl-4 space-y-1.5">
            <li>
              <span className="font-semibold text-red-600">{catalogueRate}% de commission</span> —
              Si les élèves s'inscrivent via nos catalogues, publicités ou recommandations.
            </li>
            <li>
              <span className="font-semibold text-green-600">{creatorRate}% de commission</span> —
              Si les élèves arrivent directement dans votre canal (votre propre lien de partage).
            </li>
            <li>
              <span className="font-semibold text-blue-600">{boostRate}% de commission</span> —
              Si vous payez pour booster votre formation au sein de notre plateforme.
            </li>
          </ul>
          <p className="pt-1">
            • Toute nouvelle formation est soumise à validation par nos administrateurs avant publication.
          </p>
          <p>• Les administrateurs peuvent approuver, refuser ou demander des modifications.</p>
          <p>• Vous conservez la propriété intellectuelle de votre contenu.</p>
        </div>
        <div className="space-y-3 pt-2 border-t">
          <div className="flex items-start space-x-2">
            <Checkbox
              id="creator-read-conditions"
              checked={readTerms}
              onCheckedChange={(checked) => setReadTerms(checked === true)}
            />
            <label htmlFor="creator-read-conditions" className="text-sm cursor-pointer leading-tight">
              J'ai lu les conditions ci-dessus *
            </label>
          </div>
          <div className="flex items-start space-x-2">
            <Checkbox
              id="creator-accept-conditions"
              checked={acceptTerms}
              onCheckedChange={(checked) => setAcceptTerms(checked === true)}
            />
            <label
              htmlFor="creator-accept-conditions"
              className="text-sm cursor-pointer leading-tight"
            >
              J'accepte les conditions et les taux de commission *
            </label>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={handleSaveDraft}
          disabled={savingDraft || submitting}
        >
          {savingDraft ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Sauvegarde...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              {draftId ? 'Mettre à jour le brouillon' : 'Enregistrer en brouillon'}
            </>
          )}
        </Button>
        <Button
          type="submit"
          className="flex-1 bg-[#25d366] hover:bg-[#25d366]/90"
          disabled={!readTerms || !acceptTerms || submitting || savingDraft}
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Soumission...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Soumettre aux administrateurs
            </>
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#25d366]/15">
              <BookOpen className="h-5 w-5 text-[#25d366]" />
            </div>
            <div>
              <DialogTitle className="flex items-center gap-2">
                Créer une formation complète
                {draftId && (
                  <Badge variant="secondary" className="text-xs font-normal">
                    Brouillon en cours
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription>
                {draftId
                  ? 'Votre brouillon a été chargé automatiquement. Continuez votre configuration.'
                  : 'Configurez votre formation, ses niveaux et ses leçons.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {loadingDraft ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-[#25d366]" />
            <p className="text-sm">Chargement du brouillon...</p>
          </div>
        ) : (
          <DynamicFormationForm
            key={draftId || 'new'}
            onSubmit={handleSubmitToAdmins}
            isLoading={submitting || savingDraft}
            initialData={draftInitialData ?? undefined}
            isEditing={!!draftId}
            formDataRef={formDataRef}
            customSubmitSection={customSubmitSection}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CreatorFormationModal;
