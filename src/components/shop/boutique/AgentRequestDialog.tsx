/**
 * Dialog affiché quand un utilisateur ouvre l'onglet Gestion
 * sans avoir de compte agent dans la boutique.
 * Permet de demander l'accès avec un rôle souhaité.
 */
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Textarea } from '@/components/ui/textarea';
import { UserPlus, Loader2 } from 'lucide-react';
import { useRequestAgentAccess } from '@/hooks/shop/useShopAgentRequests';
import { useAuth } from '@/hooks/useAuth';

const AVAILABLE_ROLES = [
  { value: 'vendeur', label: 'Vendeur' },
  { value: 'comptable', label: 'Comptable' },
  { value: 'gardien', label: 'Gardien' },
  { value: 'caissier', label: 'Caissier' },
  { value: 'magasinier', label: 'Magasinier' },
  { value: 'livreur', label: 'Livreur' },
  { value: 'autre', label: 'Autre' },
];

interface AgentRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shopId: string;
  shopName?: string;
}

const AgentRequestDialog: React.FC<AgentRequestDialogProps> = ({
  open,
  onOpenChange,
  shopId,
  shopName,
}) => {
  const { user } = useAuth();
  const requestAccess = useRequestAgentAccess();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [requestedRole, setRequestedRole] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !requestedRole) return;

    await requestAccess.mutateAsync({
      shopId,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      requestedRole,
      message: message.trim(),
    });

    onOpenChange(false);
    setFirstName('');
    setLastName('');
    setRequestedRole('');
    setMessage('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus size={20} className="text-primary" />
            Rejoindre {shopName ? `"${shopName}"` : 'la boutique'}
          </DialogTitle>
          <DialogDescription>
            Créez votre compte agent. Le propriétaire devra approuver votre demande et vous attribuer un rôle.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="firstName">Prénom</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Votre prénom"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Nom</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Votre nom"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Poste souhaité</Label>
            <Select value={requestedRole} onValueChange={setRequestedRole}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un poste" />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_ROLES.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message (optionnel)</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Pourquoi souhaitez-vous rejoindre cette boutique ?"
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={!firstName.trim() || !lastName.trim() || !requestedRole || requestAccess.isPending}
              className="flex-1"
            >
              {requestAccess.isPending ? (
                <Loader2 size={16} className="mr-2 animate-spin" />
              ) : (
                <UserPlus size={16} className="mr-2" />
              )}
              Envoyer la demande
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AgentRequestDialog;
