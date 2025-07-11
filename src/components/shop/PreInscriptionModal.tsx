
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Clock, Send } from 'lucide-react';

interface PreInscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  formation: {
    id: string;
    title: string;
    description?: string;
  };
}

const PreInscriptionModal: React.FC<PreInscriptionModalProps> = ({
  isOpen,
  onClose,
  formation
}) => {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [motivation, setMotivation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error('L\'email est obligatoire');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Ici on pourrait enregistrer la pré-inscription en base
      // Pour l'instant, on simule juste le succès
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Pré-inscription enregistrée avec succès !');
      setEmail('');
      setPhone('');
      setMotivation('');
      onClose();
    } catch (error) {
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-600">
            <Clock size={20} />
            Pré-inscription
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
            <h3 className="font-semibold text-orange-800 mb-2">{formation.title}</h3>
            <p className="text-sm text-orange-700">
              Cette formation est actuellement en développement. Laissez-nous vos coordonnées 
              pour être notifié(e) dès qu'elle sera disponible !
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                required
              />
            </div>

            <div>
              <Label htmlFor="phone">Téléphone (optionnel)</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+33 6 12 34 56 78"
              />
            </div>

            <div>
              <Label htmlFor="motivation">Pourquoi cette formation vous intéresse-t-elle ?</Label>
              <Textarea
                id="motivation"
                value={motivation}
                onChange={(e) => setMotivation(e.target.value)}
                placeholder="Dites-nous ce qui vous motive..."
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
                disabled={isSubmitting}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-orange-500 hover:bg-orange-600"
              >
                {isSubmitting ? (
                  'Envoi...'
                ) : (
                  <>
                    <Send size={16} className="mr-2" />
                    S'inscrire
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PreInscriptionModal;