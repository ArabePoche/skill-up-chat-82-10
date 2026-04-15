/**
 * Modal de choix de template de site scolaire avec système d'achat en SC.
 * Les templates payants nécessitent une confirmation avant achat.
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, LayoutTemplate, CheckCircle2, Coins, Lock, ImageIcon, ShieldCheck, AlertTriangle } from 'lucide-react';
import { School } from '@/school/hooks/useSchool';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface Template {
  id: string;
  name: string;
  description: string;
  thumbnail_url: string;
  theme_config: any;
  price_sc: number;
}

interface ImageDimensions {
  width: number;
  height: number;
}

/**
 * Modale de confirmation d'achat d'un template
 */
function PurchaseConfirmationModal({
  open,
  onOpenChange,
  template,
  onConfirm,
  isPurchasing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: Template | null;
  onConfirm: () => void;
  isPurchasing: boolean;
}) {
  const { t } = useTranslation();

  // Récupérer le solde SC de l'école
  const { data: conversionSettings } = useQuery({
    queryKey: ['currency-conversion-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('currency_conversion_settings')
        .select('sc_to_fcfa_rate')
        .single();
      if (error) return null;
      return data;
    },
    enabled: open && !!template,
  });

  if (!template) return null;

  const fcfaEquivalent = conversionSettings?.sc_to_fcfa_rate
    ? (template.price_sc * conversionSettings.sc_to_fcfa_rate)
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Confirmer l'achat
          </DialogTitle>
          <DialogDescription>
            Vérifiez les détails avant de procéder à l'achat du modèle.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Aperçu du template */}
          <div className="flex items-start gap-4">
            {template.thumbnail_url ? (
              <div className="w-20 h-36 rounded-lg overflow-hidden bg-muted border border-border flex-shrink-0">
                <img
                  src={template.thumbnail_url}
                  alt={template.name}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-20 h-36 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-base">{template.name}</h4>
              <p className="text-sm text-muted-foreground line-clamp-3 mt-1">
                {template.description}
              </p>
            </div>
          </div>

          <Separator />

          {/* Détails du prix */}
          <div className="space-y-2 bg-muted/50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Prix du modèle</span>
              <span className="font-semibold flex items-center gap-1">
                <Coins className="h-4 w-4 text-warning" />
                {template.price_sc} SC
              </span>
            </div>
            {fcfaEquivalent && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Équivalent FCFA</span>
                <span className="text-sm font-medium">
                  ≈ {fcfaEquivalent.toLocaleString('fr-FR')} FCFA
                </span>
              </div>
            )}
            <Separator className="my-2" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total à débiter</span>
              <span className="font-bold text-lg flex items-center gap-1 text-primary">
                <Coins className="h-5 w-5" />
                {template.price_sc} SC
              </span>
            </div>
          </div>

          {/* Avertissement */}
          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-warning/10 rounded-lg p-3 border border-warning/20">
            <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
            <span>
              Le montant sera débité de votre solde Soumboulah Cash. 
              Une fois acheté, ce modèle restera disponible pour votre école de façon permanente.
            </span>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPurchasing}
            className="w-full sm:w-auto"
          >
            Annuler
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isPurchasing}
            className="w-full sm:w-auto"
          >
            {isPurchasing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Coins className="h-4 w-4 mr-2" />
            )}
            Confirmer l'achat ({template.price_sc} SC)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SchoolSiteTemplatesModal({ 
  open, 
  onOpenChange, 
  school 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  school: School;
}) {
  const { t } = useTranslation();
  const [purchasing, setPurchasing] = React.useState(false);
  const [imageDimensions, setImageDimensions] = React.useState<Record<string, ImageDimensions>>({});
  const [confirmTemplate, setConfirmTemplate] = React.useState<Template | null>(null);

  const { data: templates, isLoading } = useQuery({
    queryKey: ['school-site-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('school_site_templates')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return data as Template[];
    },
    enabled: open
  });

  const { data: purchases = [] } = useQuery({
    queryKey: ['school-template-purchases', school.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('school_template_purchases')
        .select('template_id')
        .eq('school_id', school.id);
      if (error) throw error;
      return data.map(p => p.template_id);
    },
    enabled: open
  });

  React.useEffect(() => {
    if (!templates) return;
    templates.forEach((tpl) => {
      if (tpl.thumbnail_url) {
        const img = new Image();
        img.onload = () => {
          setImageDimensions(prev => ({
            ...prev,
            [tpl.id]: { width: img.naturalWidth, height: img.naturalHeight }
          }));
        };
        img.src = tpl.thumbnail_url;
      }
    });
  }, [templates]);

  const executePurchase = async (template: Template) => {
    try {
      setPurchasing(true);

      const { data, error } = await supabase.rpc('purchase_school_template', {
        p_school_id: school.id,
        p_template_id: template.id
      });

      if (error) throw error;

      const result = data as any;
      if (!result.success) {
        if (result.error === 'insufficient_balance') {
          toast.error(
            t('school.insufficientBalance', { 
              defaultValue: `Solde SC insuffisant. Requis : ${result.required} SC, disponible : ${result.available} SC.` 
            })
          );
        } else {
          toast.error(t('common.error', { defaultValue: 'Une erreur est survenue.' }));
        }
        return;
      }

      if (result.already_owned) {
        toast.success(t('school.templateApplied', { defaultValue: 'Modèle appliqué avec succès.' }));
      } else if (result.price_paid > 0) {
        toast.success(
          t('school.templatePurchased', { 
            defaultValue: `Modèle acheté pour ${result.price_paid} SC et appliqué !` 
          })
        );
      } else {
        toast.success(t('school.templateApplied', { defaultValue: 'Modèle appliqué avec succès.' }));
      }

      setConfirmTemplate(null);
      onOpenChange(false);
    } catch (err: any) {
      console.error('Template purchase error:', err);
      toast.error(t('common.error', { defaultValue: 'Une erreur est survenue.' }));
    } finally {
      setPurchasing(false);
    }
  };

  const handleSelectTemplate = (template: Template) => {
    const isSelected = school.site_template_id === template.id;
    if (isSelected) return;

    const isOwned = purchases.includes(template.id);
    const isFree = template.price_sc <= 0;
    const needsPurchase = !isOwned && !isFree;

    if (needsPurchase) {
      // Ouvrir la modale de confirmation pour les templates payants
      setConfirmTemplate(template);
    } else {
      // Appliquer directement les templates gratuits ou déjà achetés
      executePurchase(template);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LayoutTemplate className="h-5 w-5 text-primary" />
              {t('school.chooseTemplate', { defaultValue: 'Choisissez le modèle de votre site public' })}
            </DialogTitle>
          </DialogHeader>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Chargement des modèles...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
              {templates?.map((tpl) => {
                const isSelected = school.site_template_id === tpl.id;
                const isOwned = purchases.includes(tpl.id);
                const isFree = tpl.price_sc <= 0;
                const needsPurchase = !isOwned && !isFree && !isSelected;
                const dimensions = imageDimensions[tpl.id];
                
                return (
                  <div 
                    key={tpl.id} 
                    className={`group relative flex flex-col justify-between overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md ${
                      isSelected ? 'ring-2 ring-primary border-transparent' : 'border-border'
                    }`}
                  >
                    {/* Miniature du template - affichage intégral sans rognage */}
                    {tpl.thumbnail_url ? (
                      <div className="w-full aspect-[9/16] overflow-hidden bg-muted relative">
                        <img 
                          src={tpl.thumbnail_url} 
                          alt={tpl.name} 
                          className="w-full h-full object-contain"
                        />
                        {dimensions && (
                          <div className="absolute bottom-2 right-2 bg-background/90 text-foreground text-xs px-2 py-1 rounded-md flex items-center gap-1 shadow-sm border border-border">
                            <ImageIcon className="h-3 w-3" />
                            {dimensions.width} × {dimensions.height}px
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-full aspect-[9/16] bg-muted flex items-center justify-center">
                        <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
                      </div>
                    )}
                    <div className="p-6 pb-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-lg">{tpl.name}</h3>
                        <div className="flex items-center gap-2">
                          {isSelected && <CheckCircle2 className="h-5 w-5 text-primary" />}
                          {isOwned && !isSelected && (
                            <Badge variant="secondary" className="text-xs">Acheté</Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {tpl.description}
                      </p>
                      {dimensions && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Dimensions: {dimensions.width} × {dimensions.height} pixels
                        </p>
                      )}
                      {/* Prix */}
                      <div className="flex items-center gap-1 mt-3 text-sm font-semibold text-warning">
                        <Coins className="h-4 w-4" />
                        {isFree ? (
                          <span className="text-success">Gratuit</span>
                        ) : (
                          <span>{tpl.price_sc} SC</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="p-6 pt-0 mt-auto">
                      <Button 
                        className={`w-full ${isSelected ? 'bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30' : ''}`}
                        variant={isSelected ? 'outline' : needsPurchase ? 'default' : 'default'}
                        onClick={() => handleSelectTemplate(tpl)}
                        disabled={isSelected || purchasing}
                      >
                        {purchasing ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : needsPurchase ? (
                          <Lock className="h-4 w-4 mr-2" />
                        ) : null}
                        {isSelected 
                          ? t('school.templateActive', { defaultValue: 'Modèle actif' }) 
                          : needsPurchase
                            ? t('school.buyTemplate', { defaultValue: `Acheter (${tpl.price_sc} SC)` })
                            : t('school.applyTemplate', { defaultValue: 'Appliquer ce modèle' })}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modale de confirmation d'achat */}
      <PurchaseConfirmationModal
        open={!!confirmTemplate}
        onOpenChange={(open) => { if (!open) setConfirmTemplate(null); }}
        template={confirmTemplate}
        onConfirm={() => confirmTemplate && executePurchase(confirmTemplate)}
        isPurchasing={purchasing}
      />
    </>
  );
}
