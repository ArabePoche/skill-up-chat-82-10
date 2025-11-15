// Composant pour sélectionner ou créer une famille et remplir les champs d'un formulaire
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFamilies, useCreateFamily } from '../hooks/useFamilies';
import { Plus } from 'lucide-react';

interface FamilyFormSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  onFamilySelect: (familyData: {
    family_name: string;
    primary_contact_name?: string;
    primary_contact_phone?: string;
    primary_contact_email?: string;
    address?: string;
  }) => void;
}

export const FamilyFormSelector: React.FC<FamilyFormSelectorProps> = ({
  isOpen,
  onClose,
  schoolId,
  onFamilySelect,
}) => {
  const { data: families, isLoading } = useFamilies(schoolId);
  const createFamily = useCreateFamily();
  const [mode, setMode] = useState<'select' | 'create'>('select');
  const [formData, setFormData] = useState({
    family_name: '',
    primary_contact_name: '',
    primary_contact_phone: '',
    primary_contact_email: '',
    address: '',
  });

  const handleSelectExisting = (familyId: string) => {
    const family = families?.find(f => f.id === familyId);
    if (family) {
      onFamilySelect({
        family_name: family.family_name,
        primary_contact_name: family.primary_contact_name || '',
        primary_contact_phone: family.primary_contact_phone || '',
        primary_contact_email: family.primary_contact_email || '',
        address: family.address || '',
      });
      onClose();
    }
  };

  const handleCreateNew = async () => {
    if (!formData.family_name) return;

    try {
      const family = await createFamily.mutateAsync({
        school_id: schoolId,
        ...formData,
      });

      onFamilySelect({
        family_name: family.family_name,
        primary_contact_name: family.primary_contact_name || '',
        primary_contact_phone: family.primary_contact_phone || '',
        primary_contact_email: family.primary_contact_email || '',
        address: family.address || '',
      });
      onClose();
    } catch (error) {
      console.error('Erreur création famille:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Sélectionner ou créer une famille</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={mode === 'select' ? 'default' : 'outline'}
              onClick={() => setMode('select')}
              className="flex-1"
            >
              Sélectionner existante
            </Button>
            <Button
              type="button"
              variant={mode === 'create' ? 'default' : 'outline'}
              onClick={() => setMode('create')}
              className="flex-1"
            >
              <Plus className="w-4 h-4 mr-2" />
              Créer nouvelle
            </Button>
          </div>

          {mode === 'select' ? (
            <div className="space-y-2">
              <Label>Famille existante</Label>
              <Select onValueChange={handleSelectExisting} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une famille" />
                </SelectTrigger>
                <SelectContent>
                  {families?.map((family) => (
                    <SelectItem key={family.id} value={family.id}>
                      {family.family_name}
                      {family.primary_contact_name && ` - ${family.primary_contact_name}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="family_name">Nom de la famille *</Label>
                <Input
                  id="family_name"
                  value={formData.family_name}
                  onChange={(e) => setFormData({ ...formData, family_name: e.target.value })}
                  placeholder="Ex: Famille Dupont"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="primary_contact_name">Nom du contact principal</Label>
                <Input
                  id="primary_contact_name"
                  value={formData.primary_contact_name}
                  onChange={(e) => setFormData({ ...formData, primary_contact_name: e.target.value })}
                  placeholder="Nom complet"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="primary_contact_phone">Téléphone</Label>
                  <Input
                    id="primary_contact_phone"
                    value={formData.primary_contact_phone}
                    onChange={(e) => setFormData({ ...formData, primary_contact_phone: e.target.value })}
                    placeholder="+225 XX XX XX XX"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="primary_contact_email">Email</Label>
                  <Input
                    id="primary_contact_email"
                    type="email"
                    value={formData.primary_contact_email}
                    onChange={(e) => setFormData({ ...formData, primary_contact_email: e.target.value })}
                    placeholder="email@example.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Adresse</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Adresse complète"
                />
              </div>

              <Button
                type="button"
                onClick={handleCreateNew}
                disabled={!formData.family_name || createFamily.isPending}
                className="w-full"
              >
                {createFamily.isPending ? 'Création...' : 'Créer et utiliser cette famille'}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
