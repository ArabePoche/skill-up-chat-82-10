// Dialog de création d'une cagnotte solidaire
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateCampaign, useSolidaritySettings } from '../hooks/useSolidarityCampaigns';
import { Heart, Info } from 'lucide-react';
import coinSC from '@/assets/coin-soumboulah-cash.png';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CreateCampaignDialog: React.FC<Props> = ({ open, onOpenChange }) => {
  const { mutate: create, isPending } = useCreateCampaign();
  const { data: settings } = useSolidaritySettings();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [goalAmount, setGoalAmount] = useState('');
  const [beneficiary, setBeneficiary] = useState('');
  const [deadline, setDeadline] = useState('');

  const commissionRate = settings?.default_commission_rate || 5;
  const minGoal = settings?.min_campaign_goal || 1000;
  const maxGoal = settings?.max_campaign_goal || 10000000;

  const handleSubmit = () => {
    const goal = Number(goalAmount);
    if (!title.trim() || !description.trim() || !goal) return;
    if (goal < minGoal || goal > maxGoal) return;

    create({
      title: title.trim(),
      description: description.trim(),
      goal_amount: goal,
      beneficiary_name: beneficiary.trim() || undefined,
      deadline: deadline || undefined,
      commission_rate: commissionRate,
    });
    // Reset
    setTitle('');
    setDescription('');
    setGoalAmount('');
    setBeneficiary('');
    setDeadline('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="text-rose-500" size={20} />
            Créer une cagnotte
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
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
            <Label htmlFor="goal">Objectif (SC) *</Label>
            <div className="flex items-center gap-2">
              <img src={coinSC} alt="SC" className="w-6 h-6" />
              <Input
                id="goal"
                type="number"
                value={goalAmount}
                onChange={e => setGoalAmount(e.target.value)}
                placeholder={`Min: ${minGoal} SC`}
                min={minGoal}
                max={maxGoal}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Entre {minGoal.toLocaleString('fr-FR')} et {maxGoal.toLocaleString('fr-FR')} SC
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
            disabled={isPending || !title.trim() || !description.trim() || !goalAmount}
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
