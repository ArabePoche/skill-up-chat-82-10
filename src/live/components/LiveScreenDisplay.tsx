import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Clapperboard, Coins, Eye, FileText, GraduationCap, NotebookPen, ShoppingBag, Sparkles, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { LiveScreen } from '@/live/types';
import { getLiveFormationImage, getLiveFormationPlanLabel, getLiveProductImage, getLiveTeachingLessonImage, getLiveTeachingStudioActiveScene } from '@/live/types';

interface LiveScreenDisplayProps {
  screen: LiveScreen;
  variant?: 'public' | 'private';
  isHost?: boolean;
  canEnroll?: boolean;
  isEnrollmentPending?: boolean;
  onBuyProduct?: () => void;
  onOpenFormation?: () => void;
  onOpenLesson?: () => void;
  onEnroll?: (planType: 'free' | 'standard' | 'premium' | 'groupe') => void;
}

const LiveScreenDisplay: React.FC<LiveScreenDisplayProps> = ({
  screen,
  variant = 'public',
  isHost = false,
  canEnroll = false,
  isEnrollmentPending = false,
  onBuyProduct,
  onOpenFormation,
  onOpenLesson,
  onEnroll,
}) => {
  const isPrivate = variant === 'private';
  const isPublicFormation = !isPrivate && screen.type === 'formation_enrollment';
  const isPublicTeachingStudio = !isPrivate && screen.type === 'teaching_studio';
  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);

  useEffect(() => {
    setIsPlanDialogOpen(false);
  }, [screen]);

  const wrapperClassName = isPrivate
    ? 'w-full max-w-sm border-white/10 bg-black/65 text-white shadow-2xl'
    : isPublicFormation
    ? 'w-full max-w-[19rem] border-white/15 bg-black/62 text-white shadow-[0_16px_50px_rgba(0,0,0,0.28)]'
    : isPublicTeachingStudio
    ? 'w-full max-w-xl border-white/15 bg-black/72 text-white shadow-[0_22px_80px_rgba(0,0,0,0.38)]'
    : 'w-full max-w-md border-white/15 bg-black/70 text-white shadow-[0_20px_80px_rgba(0,0,0,0.35)]';

  if (screen.type === 'shop_product') {
    const image = getLiveProductImage(screen.product);

    return (
      <Card className={cn('overflow-hidden backdrop-blur-xl', wrapperClassName)}>
        <div className="relative h-32 w-full overflow-hidden bg-gradient-to-br from-emerald-500/30 via-teal-500/15 to-cyan-500/30 sm:h-40">
          {image ? (
            <img src={image} alt={screen.product.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ShoppingBag className="h-10 w-10 text-white/60" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
          <div className="absolute left-3 top-3 flex gap-2">
            <Badge className="border-0 bg-emerald-500/90 text-white hover:bg-emerald-500/90">
              <Sparkles className="mr-1 h-3 w-3" />
              {isPrivate ? 'Écran privé' : 'Écran shop'}
            </Badge>
            {screen.product.stock !== null && screen.product.stock !== undefined && (
              <Badge variant="secondary" className="border-0 bg-black/45 text-white">
                Stock {screen.product.stock}
              </Badge>
            )}
          </div>
        </div>
        <CardContent className="space-y-3 p-4">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200/90">
              Marketplace en direct
            </p>
            <h3 className="line-clamp-2 text-lg font-bold text-white">{screen.product.title}</h3>
            {screen.product.seller_name && (
              <p className="text-xs text-white/70">Par {screen.product.seller_name}</p>
            )}
          </div>
          {screen.product.description && (
            <p className="line-clamp-3 text-sm text-white/80">{screen.product.description}</p>
          )}
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/55">Prix</p>
              <p className="text-xl font-black text-emerald-300">{screen.product.price.toLocaleString('fr-FR')} FCFA</p>
            </div>
            {!isPrivate && (
              <Button onClick={onBuyProduct} className="bg-emerald-500 text-white hover:bg-emerald-600">
                <Coins className="mr-2 h-4 w-4" />
                Acheter
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (screen.type === 'teaching_studio') {
    const image = getLiveTeachingLessonImage(screen.studio.lesson);
    const activeScene = getLiveTeachingStudioActiveScene(screen.studio);
    const documentElement = activeScene?.elements.find((element) => element.type === 'document' && element.document_url);

    return (
      <Card className={cn('overflow-hidden backdrop-blur-xl', wrapperClassName)}>
        <div className="relative h-32 w-full overflow-hidden bg-gradient-to-br from-sky-500/30 via-cyan-500/15 to-emerald-500/30 sm:h-40">
          {image ? (
            <img src={image} alt={screen.studio.lesson.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <GraduationCap className="h-10 w-10 text-white/60" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            <Badge className="border-0 bg-sky-500/90 text-white hover:bg-sky-500/90">
              <GraduationCap className="mr-1 h-3 w-3" />
              {isPrivate ? 'Studio privé' : 'Studio enseignant'}
            </Badge>
            <Badge variant="secondary" className="border-0 bg-black/45 text-white">
              {screen.studio.scenes.length} scène{screen.studio.scenes.length > 1 ? 's' : ''}
            </Badge>
          </div>
        </div>
        <CardContent className="space-y-4 p-4">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-200/90">
              Cours structuré en direct
            </p>
            <h3 className="line-clamp-2 text-lg font-bold text-white">{screen.studio.lesson.title}</h3>
            <p className="text-xs text-white/70">{screen.studio.lesson.formation_title}{activeScene?.name ? ` · ${activeScene.name}` : ''}</p>
          </div>

          {screen.studio.summary && (
            <p className="line-clamp-3 text-sm text-white/80">{screen.studio.summary}</p>
          )}

          <div className="flex flex-wrap gap-2">
            {screen.studio.scenes.map((scene) => (
              <span key={scene.id} className={`rounded-full px-3 py-1 text-[11px] font-medium ${scene.id === screen.studio.activeSceneId ? 'bg-sky-500 text-white' : 'bg-white/8 text-white/75'}`}>
                {scene.name}
              </span>
            ))}
          </div>

          <div className="grid gap-3">
            {activeScene?.elements.map((element) => (
              <div key={element.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/55">
                  {element.type === 'whiteboard' && <NotebookPen className="h-3.5 w-3.5 text-sky-300" />}
                  {element.type === 'notes' && <BookOpen className="h-3.5 w-3.5 text-amber-300" />}
                  {element.type === 'document' && <FileText className="h-3.5 w-3.5 text-emerald-300" />}
                  {element.title}
                </div>
                {element.document_name && (
                  <p className="mt-2 text-sm font-semibold text-white">{element.document_name}</p>
                )}
                {element.content && (
                  <p className="mt-2 whitespace-pre-line text-sm text-white/80">{element.content}</p>
                )}
              </div>
            ))}
          </div>

          {!isPrivate && (
            <div className="flex flex-wrap justify-end gap-2">
              {documentElement?.document_url && (
                <Button asChild variant="outline" className="border-white/20 bg-transparent text-white hover:bg-white/10">
                  <a href={documentElement.document_url} target="_blank" rel="noreferrer">
                    <FileText className="mr-2 h-4 w-4" />
                    Ouvrir le doc
                  </a>
                </Button>
              )}
              <Button onClick={onOpenLesson} className="bg-sky-500 text-white hover:bg-sky-600">
                <BookOpen className="mr-2 h-4 w-4" />
                Suivre le cours
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (screen.type === 'teaching_lesson') {
    const image = getLiveTeachingLessonImage(screen.lesson);

    return (
      <Card className={cn('overflow-hidden backdrop-blur-xl', wrapperClassName)}>
        <div className="relative h-28 w-full overflow-hidden bg-gradient-to-br from-sky-500/30 via-cyan-500/15 to-teal-500/30 sm:h-36">
          {image ? (
            <img src={image} alt={screen.lesson.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <GraduationCap className="h-10 w-10 text-white/60" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            <Badge className="border-0 bg-sky-500/90 text-white hover:bg-sky-500/90">
              <GraduationCap className="mr-1 h-3 w-3" />
              {isPrivate ? 'Écran privé' : 'Écran enseignement'}
            </Badge>
            {screen.lesson.level_title && (
              <Badge variant="secondary" className="border-0 bg-black/45 text-white">
                {screen.lesson.level_title}
              </Badge>
            )}
          </div>
        </div>
        <CardContent className="space-y-3 p-4">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-200/90">
              Leçon en direct
            </p>
            <h3 className="line-clamp-2 text-lg font-bold text-white">{screen.lesson.title}</h3>
            <p className="text-xs text-white/70">Dans {screen.lesson.formation_title}</p>
          </div>
          {screen.lesson.description && (
            <p className="line-clamp-3 text-sm text-white/80">{screen.lesson.description}</p>
          )}
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 text-xs text-white/65">
              {screen.lesson.duration && (
                <span className="inline-flex items-center gap-1">
                  <Clapperboard className="h-3.5 w-3.5" />
                  {screen.lesson.duration}
                </span>
              )}
              {screen.lesson.language && <span>{screen.lesson.language}</span>}
            </div>
            {!isPrivate && (
              <Button onClick={onOpenLesson} className="bg-sky-500 text-white hover:bg-sky-600">
                <BookOpen className="mr-2 h-4 w-4" />
                Suivre le cours
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const image = getLiveFormationImage(screen.formation);
  const pricingOptions = useMemo(() => {
    return (screen.formation.pricing_options || [])
      .filter((option) => option.is_active !== false)
      .sort((left, right) => {
        const order = { free: 0, standard: 1, premium: 2, groupe: 3 } as const;
        return (order[left.plan_type as keyof typeof order] ?? 99) - (order[right.plan_type as keyof typeof order] ?? 99);
      });
  }, [screen.formation.pricing_options]);

  const renderPricingOption = (option: typeof pricingOptions[number]) => {
    const monthlyPrice = option.price_monthly || 0;
    const yearlyPrice = option.price_yearly || 0;
    const isFreePlan = option.plan_type === 'free' || (monthlyPrice <= 0 && yearlyPrice <= 0);

    return (
      <div key={option.id || option.plan_type} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white">{getLiveFormationPlanLabel(option.plan_type)}</p>
            <p className="text-xs text-white/65">
              {isFreePlan
                ? 'Accès gratuit'
                : yearlyPrice > 0
                ? `${monthlyPrice.toLocaleString('fr-FR')} FCFA / mois · ${yearlyPrice.toLocaleString('fr-FR')} FCFA / an`
                : `${monthlyPrice.toLocaleString('fr-FR')} FCFA / mois`}
            </p>
          </div>
          {!isPrivate && !isHost && canEnroll && (
            <Button
              size="sm"
              onClick={() => onEnroll?.(option.plan_type as 'free' | 'standard' | 'premium' | 'groupe')}
              disabled={isEnrollmentPending}
              className="bg-orange-500 text-white hover:bg-orange-600"
            >
              {isEnrollmentPending ? 'Inscription...' : 'Choisir'}
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <Card className={cn('overflow-hidden backdrop-blur-xl', wrapperClassName)}>
        <div className={cn(
          'relative w-full overflow-hidden bg-gradient-to-br from-amber-500/25 via-orange-500/15 to-rose-500/30',
          isPublicFormation ? 'h-24 sm:h-28' : 'h-32 sm:h-40'
        )}>
        {image ? (
          <img src={image} alt={screen.formation.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <BookOpen className="h-10 w-10 text-white/60" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <Badge className="border-0 bg-orange-500/90 text-white hover:bg-orange-500/90">
            <BookOpen className="mr-1 h-3 w-3" />
            {isPrivate ? 'Écran privé' : 'Inscription live'}
          </Badge>
          <Badge variant="secondary" className="border-0 bg-black/45 text-white">
            <Users className="mr-1 h-3 w-3" />
            {screen.formation.students_count || 0} inscrits
          </Badge>
        </div>
        </div>
        <CardContent className={cn('space-y-3', isPublicFormation ? 'p-3' : 'p-4')}>
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-200/90">
              Formation mise en avant
            </p>
            <h3 className={cn('font-bold text-white', isPublicFormation ? 'line-clamp-2 text-base' : 'line-clamp-2 text-lg')}>
              {screen.formation.title}
            </h3>
            {screen.formation.author_name && (
              <p className="text-xs text-white/70">Par {screen.formation.author_name}</p>
            )}
          </div>
          {screen.formation.description && (
            <p className={cn('text-white/80', isPublicFormation ? 'line-clamp-2 text-xs' : 'line-clamp-3 text-sm')}>
              {screen.formation.description}
            </p>
          )}
          {!isPrivate && (
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" className="border-white/20 bg-transparent text-white hover:bg-white/10" onClick={onOpenFormation}>
                <Eye className="mr-2 h-4 w-4" />
                Voir
              </Button>
              {!isHost && canEnroll && pricingOptions.length > 0 && (
                <Button onClick={() => setIsPlanDialogOpen(true)} disabled={isEnrollmentPending} className="bg-orange-500 text-white hover:bg-orange-600">
                  <BookOpen className="mr-2 h-4 w-4" />
                  {isEnrollmentPending ? 'Inscription...' : 'S’inscrire'}
                </Button>
              )}
              {!isHost && canEnroll && pricingOptions.length === 0 && (
                <Button onClick={() => onEnroll?.('free')} disabled={isEnrollmentPending} className="bg-orange-500 text-white hover:bg-orange-600">
                  <BookOpen className="mr-2 h-4 w-4" />
                  {isEnrollmentPending ? 'Inscription...' : 'S’inscrire'}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isPlanDialogOpen} onOpenChange={setIsPlanDialogOpen}>
        <DialogContent className="max-w-md border-white/10 bg-zinc-950 text-white">
          <DialogHeader>
            <DialogTitle>Choisir un plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold text-white">{screen.formation.title}</p>
              {screen.formation.author_name && (
                <p className="text-xs text-white/65">Par {screen.formation.author_name}</p>
              )}
            </div>
            <div className="grid gap-2">
              {pricingOptions.map(renderPricingOption)}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LiveScreenDisplay;