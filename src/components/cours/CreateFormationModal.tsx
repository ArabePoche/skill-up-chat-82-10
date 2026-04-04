/**
 * Modal de création de formation avec conditions d'utilisation obligatoires
 * Affiche les taux de commission dynamiques et soumet la formation pour approbation admin
 */
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, BookOpen, Loader2, Save, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';


interface CreateFormationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const CreateFormationModal: React.FC<CreateFormationModalProps> = ({ open, onOpenChange, onSuccess }) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [readConditions, setReadConditions] = useState(false);
  const [acceptConditions, setAcceptConditions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  // Charger les taux de commission dynamiques
  const { data: commissionSettings } = useQuery({
    queryKey: ['formation-commission-settings'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('formation_commission_settings')
        .select('*')
        .eq('is_active', true)
        .order('commission_rate', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  const createFormation = async (isDraft: boolean) => {
    if (!title.trim()) {
      toast.error('Le titre est requis');
      return false;
    }

    const formationId = crypto.randomUUID();
    const insertData: any = {
      id: formationId,
      title: title.trim(),
      description: description.trim(),
      price: price ? parseFloat(price) : 0,
      author_id: user?.id,
      is_active: false,
    };

    if (isDraft) {
      insertData.approval_status = 'draft';
    } else {
      if (!readConditions || !acceptConditions) {
        toast.error('Vous devez lire et accepter les conditions');
        return false;
      }
      insertData.approval_status = 'pending';
      insertData.terms_accepted = true;
      insertData.submitted_at = new Date().toISOString();
    }

    const { error } = await supabase.from('formations').insert(insertData);
    if (error) throw error;
    return true;
  };

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    try {
      const success = await createFormation(true);
      if (!success) return;
      toast.success('Formation enregistrée en brouillon. Vous pouvez y revenir ultérieurement.');
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error saving draft:', error);
      toast.error('Erreur lors de l\'enregistrement : ' + (error.message || ''));
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const success = await createFormation(false);
      if (!success) return;
      toast.success('Formation soumise pour approbation ! Un administrateur la validera bientôt.');
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error creating formation:', error);
      toast.error('Erreur lors de la création : ' + (error.message || ''));
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPrice('');
    setReadConditions(false);
    setAcceptConditions(false);
  };

  const catalogueRate = commissionSettings?.find((c: any) => c.commission_type === 'catalogue')?.commission_rate || 35;
  const creatorRate = commissionSettings?.find((c: any) => c.commission_type === 'creator_channel')?.commission_rate || 10;
  const boostRate = commissionSettings?.find((c: any) => c.commission_type === 'boost')?.commission_rate || 20;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Créer une formation
          </DialogTitle>
          <DialogDescription>
            Votre formation sera soumise à validation avant publication. Vous pouvez aussi l'enregistrer en brouillon pour y revenir ultérieurement.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Infos de base */}
            <div className="space-y-2">
              <Label htmlFor="title">Titre de la formation *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Apprentissage du Coran"
                required
                maxLength={200}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Décrivez votre formation..."
                rows={3}
                maxLength={2000}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Prix (FCFA/mois)</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="100"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0 = Gratuit"
              />
            </div>

            {/* Conditions d'utilisation */}
            <div className="bg-muted/50 border rounded-lg p-4 space-y-3">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Conditions et Commissions
              </h4>
              
              <div className="text-xs text-muted-foreground space-y-2">
                <p className="font-medium text-foreground">En publiant votre formation sur notre plateforme, vous acceptez les conditions suivantes :</p>
                
                <ul className="list-disc pl-4 space-y-1.5">
                  <li>
                    <span className="font-semibold text-red-600">{catalogueRate}% de commission</span> — Si les élèves s'inscrivent via nos catalogues, publicités ou recommandations de la plateforme.
                  </li>
                  <li>
                    <span className="font-semibold text-green-600">{creatorRate}% de commission</span> — Si les élèves arrivent directement dans votre canal (votre propre lien de partage).
                  </li>
                  <li>
                    <span className="font-semibold text-blue-600">{boostRate}% de commission</span> — Si vous payez pour booster votre formation au sein de notre plateforme.
                  </li>
                </ul>

                <p className="pt-1">
                  • Toute nouvelle formation est soumise à validation par nos administrateurs avant publication.
                </p>
                <p>
                  • Les administrateurs peuvent approuver, refuser ou demander des modifications.
                </p>
                <p>
                  • Vous conservez la propriété intellectuelle de votre contenu.
                </p>
              </div>

              <div className="space-y-3 pt-2 border-t">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="read-conditions"
                    checked={readConditions}
                    onCheckedChange={(checked) => setReadConditions(checked === true)}
                  />
                  <label htmlFor="read-conditions" className="text-sm cursor-pointer leading-tight">
                    J'ai lu les conditions ci-dessus *
                  </label>
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="accept-conditions"
                    checked={acceptConditions}
                    onCheckedChange={(checked) => setAcceptConditions(checked === true)}
                  />
                  <label htmlFor="accept-conditions" className="text-sm cursor-pointer leading-tight">
                    J'accepte les conditions et les taux de commission *
                  </label>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Button
                type="submit"
                className="w-full"
                disabled={submitting || savingDraft || !readConditions || !acceptConditions || !title.trim()}
              >
                {submitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Soumission...</>
                ) : (
                  <><Send className="h-4 w-4 mr-2" />Soumettre pour validation</>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={submitting || savingDraft || !title.trim()}
                onClick={handleSaveDraft}
              >
                {savingDraft ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Enregistrement...</>
                ) : (
                  <><Save className="h-4 w-4 mr-2" />Enregistrer en brouillon</>
                )}
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default CreateFormationModal;
