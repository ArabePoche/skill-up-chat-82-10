// Dialog de création d'une cagnotte solidaire
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateCampaign, useSolidaritySettings } from '../hooks/useSolidarityCampaigns';
import { useCurrencySettings } from '@/hooks/admin/useCurrencySettings';
import { Heart, Images, Info } from 'lucide-react';
import coinSC from '@/assets/coin-soumboulah-cash.png';
import CampaignImageUploader from './CampaignImageUploader';
import CampaignGalleryUploader, { GalleryItem } from './CampaignGalleryUploader';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n));

const CreateCampaignDialog: React.FC<Props> = ({ open, onOpenChange }) => {
  const { mutate: create, isPending } = useCreateCampaign();
  const { data: settings } = useSolidaritySettings();
  const { conversion } = useCurrencySettings();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [goalFcfa, setGoalFcfa] = useState('');
  const [beneficiary, setBeneficiary] = useState('');
  const [deadline, setDeadline] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);

  const commissionRate = settings?.default_commission_rate || 5;
  const minGoal = settings?.min_campaign_goal || 1000;
  const maxGoal = settings?.max_campaign_goal || 10000000;
  const scToFcfaRate = conversion?.sc_to_fcfa_rate || 1;

  // Conversion FCFA → SC
  const fcfaValue = Number(goalFcfa) || 0;
  const goalSc = scToFcfaRate > 0 ? Math.ceil(fcfaValue / scToFcfaRate) : 0;
  const goalValid = goalSc >= minGoal && goalSc <= maxGoal;

  const handleSubmit = () => {
    if (!title.trim() || !description.trim() || !fcfaValue || !goalValid) return;

    create({
      title: title.trim(),
      description: description.trim(),
      goal_amount: goalSc,
      beneficiary_name: beneficiary.trim() || undefined,
      deadline: deadline || undefined,
      commission_rate: commissionRate,
      image_url: imageUrl || undefined,
      galleryMedia: galleryItems.length > 0 ? galleryItems : undefined,
    });
    // Reset
    setTitle('');
    setDescription('');
    setGoalFcfa('');
    setBeneficiary('');
    setDeadline('');
    setImageUrl('');
    setGalleryItems([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="text-rose-500" size={20} />
            Créer une cagnotte
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Photo de la cagnotte</Label>
            <CampaignImageUploader imageUrl={imageUrl} onImageChange={setImageUrl} campaignTitle={title || undefined} />
          </div>

          <div>
            <Label className="flex items-center gap-1.5 mb-2">
              <Images size={14} className="text-muted-foreground" />
              Galerie (photos / vidéos de présentation)
            </Label>
            <CampaignGalleryUploader
              items={galleryItems}
              onItemsChange={setGalleryItems}
              maxItems={8}
            />
          </div>

          <div>
            <Label htmlFor="title">Titre de la cagnotte *</Label>
            <Input id="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Aide médicale pour..." />
          </div>
          <div>
            <Label htmlFor="desc">Description *</Label>
            <textarea
              id="desc"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Décrivez la situation et pourquoi vous lancez cette cagnotte..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div>
            <Label htmlFor="goal">Objectif (FCFA) *</Label>
            <Input
              id="goal"
              type="number"
              value={goalFcfa}
              onChange={e => setGoalFcfa(e.target.value)}
              placeholder="Ex: 500 000 FCFA"
              min={0}
            />
            {fcfaValue > 0 && (
              <div className="flex items-center gap-1.5 mt-1">
                <img src={coinSC} alt="SC" className="w-4 h-4" />
                <p className={`text-xs ${goalValid ? 'text-muted-foreground' : 'text-destructive'}`}>
                  {fmt(goalSc)} SC
                  {!goalValid && goalSc > 0 && (
                    <span className="ml-1">
                      (min {fmt(minGoal)} SC — max {fmt(maxGoal)} SC)
                    </span>
                  )}
                </p>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Taux : 1 SC = {fmt(scToFcfaRate)} FCFA
            </p>
          </div>
          <div>
            <Label htmlFor="beneficiary">Nom du bénéficiaire</Label>
            <Input id="beneficiary" value={beneficiary} onChange={e => setBeneficiary(e.target.value)} placeholder="Optionnel" />
          </div>
          <div>
            <Label htmlFor="deadline">Date limite</Label>
            <Input id="deadline" type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-sm">
            <Info size={16} className="text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-muted-foreground">
              Une commission de <strong>{commissionRate}%</strong> sera appliquée sur chaque contribution. 
              Votre cagnotte sera soumise aux administrateurs pour validation.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || !title.trim() || !description.trim() || !fcfaValue || !goalValid}
            className="bg-rose-500 hover:bg-rose-600 text-white"
          >
            {isPending ? 'Envoi...' : 'Soumettre'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateCampaignDialog;
