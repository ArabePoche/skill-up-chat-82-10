/**
 * Dialog pour créer une nouvelle boutique
 */
import React, { useState } from 'react';
import { Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useCreateNewShop } from '@/hooks/shop/useMultiShop';

interface CreateShopDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CreateShopDialog: React.FC<CreateShopDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  
  const createShop = useCreateNewShop();

  const handleSubmit = async () => {
    if (!name.trim()) return;

    try {
      await createShop.mutateAsync({
        name: name.trim(),
        address: address.trim() || undefined,
      });
      
      // Reset form
      setName('');
      setAddress('');
      onOpenChange(false);
    } catch (error) {
      console.error('Erreur création boutique:', error);
    }
  };

  const handleClose = () => {
    setName('');
    setAddress('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Store size={20} className="text-emerald-600" />
            Créer une nouvelle boutique
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="shop-name">Nom de la boutique *</Label>
            <Input
              id="shop-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ma nouvelle boutique"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="shop-address">Adresse (optionnel)</Label>
            <Input
              id="shop-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Rue du Commerce"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || createShop.isPending}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {createShop.isPending ? 'Création...' : 'Créer la boutique'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateShopDialog;