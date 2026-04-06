import React from 'react';
import { BookOpen, ExternalLink, Eye, ShoppingBag, Sparkles, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LiveScreen } from '@/live/types';
import { getLiveFormationImage, getLiveProductImage } from '@/live/types';

interface LiveScreenDisplayProps {
  screen: LiveScreen;
  variant?: 'public' | 'private';
  isHost?: boolean;
  canEnroll?: boolean;
  isEnrollmentPending?: boolean;
  onOpenShop?: () => void;
  onOpenFormation?: () => void;
  onEnroll?: () => void;
}

const LiveScreenDisplay: React.FC<LiveScreenDisplayProps> = ({
  screen,
  variant = 'public',
  isHost = false,
  canEnroll = false,
  isEnrollmentPending = false,
  onOpenShop,
  onOpenFormation,
  onEnroll,
}) => {
  const isPrivate = variant === 'private';
  const wrapperClassName = isPrivate
    ? 'w-full max-w-sm border-white/10 bg-black/65 text-white shadow-2xl'
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
              <Button onClick={onOpenShop} className="bg-emerald-500 text-white hover:bg-emerald-600">
                <ExternalLink className="mr-2 h-4 w-4" />
                Voir boutique
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const image = getLiveFormationImage(screen.formation);

  return (
    <Card className={cn('overflow-hidden backdrop-blur-xl', wrapperClassName)}>
      <div className="relative h-32 w-full overflow-hidden bg-gradient-to-br from-amber-500/25 via-orange-500/15 to-rose-500/30 sm:h-40">
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
      <CardContent className="space-y-3 p-4">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-200/90">
            Formation mise en avant
          </p>
          <h3 className="line-clamp-2 text-lg font-bold text-white">{screen.formation.title}</h3>
          {screen.formation.author_name && (
            <p className="text-xs text-white/70">Par {screen.formation.author_name}</p>
          )}
        </div>
        {screen.formation.description && (
          <p className="line-clamp-3 text-sm text-white/80">{screen.formation.description}</p>
        )}
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/55">Tarif</p>
            <p className="text-xl font-black text-orange-300">
              {screen.formation.price > 0 ? `${screen.formation.price.toLocaleString('fr-FR')} FCFA` : 'Gratuit'}
            </p>
          </div>
          {!isPrivate && (
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" className="border-white/20 bg-transparent text-white hover:bg-white/10" onClick={onOpenFormation}>
                <Eye className="mr-2 h-4 w-4" />
                Voir
              </Button>
              {!isHost && canEnroll && (
                <Button onClick={onEnroll} disabled={isEnrollmentPending} className="bg-orange-500 text-white hover:bg-orange-600">
                  <BookOpen className="mr-2 h-4 w-4" />
                  {isEnrollmentPending ? 'Inscription...' : 'S’inscrire'}
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default LiveScreenDisplay;