// Dialogue de "Passage de fin d'année"
// L'admin choisit l'année cible, un seuil de moyenne, et mappe chaque classe
// source vers une classe cible (passage / redoublement). Aperçu puis application.
import React, { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { GraduationCap, ArrowRight, CheckCircle2, RotateCcw, X } from 'lucide-react';
import { useSchoolYear } from '@/school/context/SchoolYearContext';
import { useSchoolClasses } from '@/school/hooks/useClasses';
import {
  usePromotionStudents,
  useApplyPromotion,
  buildPromotionPreview,
  type ClassPromotionMap,
  type PromotionAction,
} from '../hooks/useEndOfYearPromotion';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string;
}

export const EndOfYearPromotionDialog: React.FC<Props> = ({ open, onOpenChange, schoolId }) => {
  const { activeSchoolYear, schoolYears } = useSchoolYear();

  // Année source = année active ; cible = autre année (par défaut la plus récente différente)
  const [sourceYearId, setSourceYearId] = useState<string>(activeSchoolYear?.id || '');
  const defaultTarget = useMemo(() => {
    return schoolYears.find((y) => y.id !== (activeSchoolYear?.id || ''))?.id || '';
  }, [schoolYears, activeSchoolYear?.id]);
  const [targetYearId, setTargetYearId] = useState<string>(defaultTarget);
  const [cycleThresholds, setCycleThresholds] = useState<Record<string, number>>({});
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [classMap, setClassMap] = useState<ClassPromotionMap>({});
  const [overrides, setOverrides] = useState<
    Record<string, { action?: PromotionAction; targetClassId?: string | null }>
  >({});

  React.useEffect(() => {
    if (open) {
      setSourceYearId(activeSchoolYear?.id || '');
      setTargetYearId(defaultTarget);
      setCycleThresholds({});
      setStep(1);
      setClassMap({});
      setOverrides({});
    }
  }, [open, activeSchoolYear?.id, defaultTarget]);

  const { data: sourceClasses = [] } = useSchoolClasses(schoolId, sourceYearId);
  const { data: targetClasses = [] } = useSchoolClasses(schoolId, targetYearId);
  const { data: rawStudents = [], isLoading: loadingStudents } = usePromotionStudents(
    schoolId,
    sourceYearId,
  );
  const applyMutation = useApplyPromotion();

  // Récupérer les cycles uniques des classes source
  const uniqueCycles = useMemo(() => {
    const cycles = new Set((sourceClasses as any[]).map(c => c.cycle));
    return Array.from(cycles);
  }, [sourceClasses]);

  // Initialiser les seuils par défaut quand les cycles changent
  React.useEffect(() => {
    setCycleThresholds((prev) => {
      const next = { ...prev };
      uniqueCycles.forEach((cycle) => {
        if (!(cycle in next)) {
          next[cycle] = 10;
        }
      });
      return next;
    });
  }, [uniqueCycles]);

  // Auto-suggérer un mapping automatique et dynamique
  React.useEffect(() => {
    if (sourceClasses.length === 0 || targetClasses.length === 0) return;
    setClassMap((prev) => {
      const next = { ...prev };
      for (const sc of sourceClasses as any[]) {
        if (next[sc.id]) continue;
        
        // Trouver la classe avec le même nom pour le redoublement
        const sameName = (targetClasses as any[]).find((tc) => tc.name === sc.name);
        
        // Pour le passage, trouver automatiquement une classe cible dans le même cycle
        let passTargetClassId: string | null = null;
        
        // Filtrer les classes cibles dans le même cycle
        const targetClassesInCycle = (targetClasses as any[])
          .filter((tc) => tc.cycle === sc.cycle);
        
        if (targetClassesInCycle.length > 0) {
          // Essayer d'abord d'utiliser grade_order si disponible
          const hasGradeOrder = targetClassesInCycle.some((tc) => tc.grade_order != null && tc.grade_order > 0);
          
          if (hasGradeOrder && sc.grade_order != null && sc.grade_order > 0) {
            // Utiliser grade_order pour trouver la classe suivante
            const sortedByOrder = [...targetClassesInCycle].sort((a, b) => (a.grade_order || 0) - (b.grade_order || 0));
            const nextClass = sortedByOrder.find((tc) => (tc.grade_order || 0) > sc.grade_order);
            if (nextClass) {
              passTargetClassId = nextClass.id;
            } else if (sortedByOrder.length > 0) {
              passTargetClassId = sortedByOrder[sortedByOrder.length - 1].id;
            }
          } else {
            // Fallback : utiliser l'ordre alphabétique et prendre une classe différente
            const sortedByName = [...targetClassesInCycle].sort((a, b) => a.name.localeCompare(b.name));
            const sourceIndex = sortedByName.findIndex((tc) => tc.name === sc.name);
            
            if (sourceIndex >= 0) {
              // Prendre la classe suivante dans l'ordre alphabétique
              const nextIndex = (sourceIndex + 1) % sortedByName.length;
              passTargetClassId = sortedByName[nextIndex].id;
            } else {
              // Si la classe source n'existe pas dans l'année cible, prendre la première
              passTargetClassId = sortedByName[0].id;
            }
          }
        }
        
        next[sc.id] = {
          passTargetClassId,
          failTargetClassId: sameName?.id || null,
        };
      }
      return next;
    });
  }, [sourceClasses, targetClasses]);

  const preview = useMemo(
    () => buildPromotionPreview(rawStudents as any, classMap, cycleThresholds, overrides),
    [rawStudents, classMap, cycleThresholds, overrides],
  );

  const stats = useMemo(() => {
    const promote = preview.filter((p) => p.suggestedAction === 'promote').length;
    const redouble = preview.filter((p) => p.suggestedAction === 'redouble').length;
    const skip = preview.filter((p) => p.suggestedAction === 'skip').length;
    const noTarget = preview.filter(
      (p) => p.suggestedAction !== 'skip' && !p.targetClassId,
    ).length;
    return { promote, redouble, skip, noTarget, total: preview.length };
  }, [preview]);

  const sourceYearLabel = schoolYears.find((y) => y.id === sourceYearId)?.year_label || '?';
  const targetYearLabel = schoolYears.find((y) => y.id === targetYearId)?.year_label || '?';

  const handleApply = async () => {
    if (stats.noTarget > 0) return;
    await applyMutation.mutateAsync({
      schoolId,
      sourceYearId,
      targetYearId,
      entries: preview.map((p) => ({
        studentId: p.studentId,
        action: p.suggestedAction,
        targetClassId: p.targetClassId,
      })),
    });
    onOpenChange(false);
  };

  const canGoStep2 =
    sourceYearId && targetYearId && sourceYearId !== targetYearId && Object.keys(cycleThresholds).length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary" />
            Passage de fin d'année
          </DialogTitle>
          <DialogDescription>
            Définissez la moyenne minimale et la classe cible de chaque classe pour faire passer
            les élèves dans la nouvelle année scolaire. Les élèves sous le seuil restent dans leur
            classe (redoublement).
          </DialogDescription>
        </DialogHeader>

        {/* Indicateur d'étape */}
        <div className="flex items-center gap-2 text-sm">
          {[1, 2, 3].map((s) => (
            <React.Fragment key={s}>
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center font-medium ${
                  step >= (s as 1 | 2 | 3)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {s}
              </div>
              <span className="text-xs">
                {s === 1 ? 'Paramètres' : s === 2 ? 'Mappage des classes' : 'Aperçu'}
              </span>
              {s < 3 && <ArrowRight className="w-3 h-3 text-muted-foreground" />}
            </React.Fragment>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {/* ============ ÉTAPE 1 : paramètres ============ */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Année source</Label>
                  <Select value={sourceYearId} onValueChange={setSourceYearId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir une année" />
                    </SelectTrigger>
                    <SelectContent>
                      {schoolYears.map((y) => (
                        <SelectItem key={y.id} value={y.id}>
                          {y.year_label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Année cible (nouvelle année)</Label>
                  <Select value={targetYearId} onValueChange={setTargetYearId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir une année" />
                    </SelectTrigger>
                    <SelectContent>
                      {schoolYears
                        .filter((y) => y.id !== sourceYearId)
                        .map((y) => (
                          <SelectItem key={y.id} value={y.id}>
                            {y.year_label}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {schoolYears.filter((y) => y.id !== sourceYearId).length === 0 && (
                    <p className="text-xs text-destructive mt-1">
                      Aucune autre année disponible. Créez la nouvelle année scolaire d'abord.
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label>Moyenne minimale pour passer (sur 20)</Label>
                <div className="space-y-3 mt-2">
                  {uniqueCycles.map((cycle) => (
                    <div key={cycle} className="flex items-center gap-4">
                      <span className="w-32 text-sm font-medium">{cycle}</span>
                      <Input
                        type="number"
                        min={0}
                        max={20}
                        step={0.1}
                        value={cycleThresholds[cycle] || 10}
                        onChange={(e) =>
                          setCycleThresholds((prev) => ({
                            ...prev,
                            [cycle]: parseFloat(e.target.value) || 0,
                          }))
                        }
                        className="max-w-xs"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Les élèves dont la moyenne annuelle est ≥ au seuil de leur cycle passent dans la classe
                  supérieure ; les autres redoublent.
                </p>
              </div>

              <Card className="bg-muted/30">
                <CardContent className="pt-4 text-sm">
                  La moyenne annuelle est calculée à partir des bulletins déjà générés
                  (school_report_card_history) pour l'année source. Un élève sans bulletin est
                  marqué "redoublement" par défaut — vous pourrez le modifier à l'étape 3.
                </CardContent>
              </Card>
            </div>
          )}

          {/* ============ ÉTAPE 2 : mapping de classes ============ */}
          {step === 2 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Pour chaque classe de {sourceYearLabel}, choisissez la classe de {targetYearLabel}{' '}
                où ira l'élève qui passe et celle où ira l'élève qui redouble.
              </p>
              {targetClasses.length === 0 && (
                <Card className="border-destructive bg-destructive/5">
                  <CardContent className="pt-4 text-sm text-destructive">
                    Aucune classe trouvée dans l'année cible ({targetYearLabel}). 
                    Veuillez d'abord créer les classes pour la nouvelle année scolaire.
                  </CardContent>
                </Card>
              )}
              {sourceClasses.length === 0 && (
                <Card>
                  <CardContent className="pt-4 text-sm text-muted-foreground">
                    Aucune classe trouvée dans l'année source.
                  </CardContent>
                </Card>
              )}
              {(sourceClasses as any[]).map((sc) => {
                const m = classMap[sc.id] || { passTargetClassId: null, failTargetClassId: null };
                return (
                  <Card key={sc.id}>
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
                        <div>
                          <div className="font-medium">{sc.name}</div>
                          <div className="text-xs text-muted-foreground">{sc.cycle}</div>
                        </div>
                        <div>
                          <Label className="text-xs">Classe pour les passages</Label>
                          <Select
                            value={m.passTargetClassId || 'none'}
                            onValueChange={(v) =>
                              setClassMap((prev) => ({
                                ...prev,
                                [sc.id]: {
                                  ...prev[sc.id],
                                  passTargetClassId: v === 'none' ? null : v,
                                  failTargetClassId: prev[sc.id]?.failTargetClassId ?? null,
                                },
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Choisir" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">— aucun —</SelectItem>
                              {(targetClasses as any[]).map((tc) => (
                                <SelectItem key={tc.id} value={tc.id}>
                                  {tc.name} ({tc.cycle})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Classe pour les redoublements</Label>
                          <Select
                            value={m.failTargetClassId || 'none'}
                            onValueChange={(v) =>
                              setClassMap((prev) => ({
                                ...prev,
                                [sc.id]: {
                                  ...prev[sc.id],
                                  passTargetClassId: prev[sc.id]?.passTargetClassId ?? null,
                                  failTargetClassId: v === 'none' ? null : v,
                                },
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Choisir" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">— aucun —</SelectItem>
                              {(targetClasses as any[]).map((tc) => (
                                <SelectItem key={tc.id} value={tc.id}>
                                  {tc.name} ({tc.cycle})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* ============ ÉTAPE 3 : aperçu ============ */}
          {step === 3 && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-xs text-muted-foreground">Total</div>
                    <div className="text-2xl font-bold">{stats.total}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-xs text-muted-foreground">Passages</div>
                    <div className="text-2xl font-bold text-green-600">{stats.promote}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-xs text-muted-foreground">Redoublements</div>
                    <div className="text-2xl font-bold text-orange-600">{stats.redouble}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-xs text-muted-foreground">Ignorés</div>
                    <div className="text-2xl font-bold text-muted-foreground">{stats.skip}</div>
                  </CardContent>
                </Card>
              </div>

              {stats.noTarget > 0 && (
                <Card className="border-destructive bg-destructive/5">
                  <CardContent className="pt-4 text-sm text-destructive">
                    {stats.noTarget} élève(s) n'ont pas de classe cible définie. Revenez à l'étape
                    2 pour mapper leur classe ou modifiez l'action ci-dessous.
                  </CardContent>
                </Card>
              )}

              <ScrollArea className="h-[400px] border rounded-md">
                <div className="divide-y">
                  {loadingStudents && (
                    <div className="p-4 text-sm text-muted-foreground">Chargement…</div>
                  )}
                  {!loadingStudents && preview.length === 0 && (
                    <div className="p-4 text-sm text-muted-foreground">
                      Aucun élève actif dans l'année source.
                    </div>
                  )}
                  {preview.map((row) => {
                    const targetClassName =
                      (targetClasses as any[]).find((c) => c.id === row.targetClassId)?.name || null;
                    const studentCycle = (rawStudents as any[]).find(s => s.studentId === row.studentId)?.sourceClassCycle;
                    const cycleThreshold = studentCycle ? (cycleThresholds[studentCycle] || 10) : 10;
                    return (
                      <div
                        key={row.studentId}
                        className="p-3 grid grid-cols-1 md:grid-cols-12 gap-2 items-center text-sm"
                      >
                        <div className="md:col-span-4">
                          <div className="font-medium">
                            {row.firstName} {row.lastName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {row.studentCode} · {row.sourceClassName || 'sans classe'}
                          </div>
                        </div>
                        <div className="md:col-span-2 text-center">
                          {row.annualAverage != null ? (
                            <Badge
                              variant={
                                row.annualAverage >= cycleThreshold ? 'default' : 'destructive'
                              }
                            >
                              {row.annualAverage.toFixed(2)} / 20
                            </Badge>
                          ) : (
                            <Badge variant="outline">aucun bulletin</Badge>
                          )}
                          <div className="text-xs text-muted-foreground mt-1">
                            {row.reportCardCount} bulletin(s)
                          </div>
                        </div>
                        <div className="md:col-span-3">
                          <Select
                            value={row.suggestedAction}
                            onValueChange={(v) =>
                              setOverrides((prev) => ({
                                ...prev,
                                [row.studentId]: {
                                  ...(prev[row.studentId] || {}),
                                  action: v as PromotionAction,
                                },
                              }))
                            }
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="promote">
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 className="w-3 h-3 text-green-600" /> Passe
                                </div>
                              </SelectItem>
                              <SelectItem value="redouble">
                                <div className="flex items-center gap-2">
                                  <RotateCcw className="w-3 h-3 text-orange-600" /> Redouble
                                </div>
                              </SelectItem>
                              <SelectItem value="skip">
                                <div className="flex items-center gap-2">
                                  <X className="w-3 h-3 text-muted-foreground" /> Ignorer
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="md:col-span-3">
                          {row.suggestedAction !== 'skip' ? (
                            <Select
                              value={row.targetClassId || 'none'}
                              onValueChange={(v) =>
                                setOverrides((prev) => ({
                                  ...prev,
                                  [row.studentId]: {
                                    ...(prev[row.studentId] || {}),
                                    targetClassId: v === 'none' ? null : v,
                                  },
                                }))
                              }
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue placeholder="Classe cible" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">— non définie —</SelectItem>
                                {(targetClasses as any[]).map((tc) => (
                                  <SelectItem key={tc.id} value={tc.id}>
                                    {tc.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                          {targetClassName && row.suggestedAction !== 'skip' && (
                            <div className="text-xs text-muted-foreground mt-1 truncate">
                              → {targetClassName}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-row justify-between sm:justify-between gap-2">
          <Button
            variant="outline"
            onClick={() => {
              if (step === 1) onOpenChange(false);
              else setStep((step - 1) as 1 | 2 | 3);
            }}
          >
            {step === 1 ? 'Annuler' : 'Retour'}
          </Button>

          {step < 3 ? (
            <Button
              onClick={() => setStep((step + 1) as 1 | 2 | 3)}
              disabled={step === 1 ? !canGoStep2 : false}
            >
              Suivant
            </Button>
          ) : (
            <Button
              onClick={handleApply}
              disabled={
                applyMutation.isPending || stats.noTarget > 0 || stats.promote + stats.redouble === 0
              }
            >
              {applyMutation.isPending
                ? 'Application…'
                : `Appliquer (${stats.promote + stats.redouble} élève(s))`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
