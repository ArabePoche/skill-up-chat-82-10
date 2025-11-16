// Formulaire pour créer/éditer une famille
import React from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CreateFamilyData, Family } from '../hooks/useFamilies';

interface FamilyFormProps {
  schoolId: string;
  family?: Family;
  onSubmit: (data: CreateFamilyData) => void;
  onCancel: () => void;
}

export const FamilyForm: React.FC<FamilyFormProps> = ({
  schoolId,
  family,
  onSubmit,
  onCancel,
}) => {
  const { register, handleSubmit, formState: { errors } } = useForm<CreateFamilyData>({
    defaultValues: family ? {
      school_id: family.school_id,
      family_name: family.family_name,
      primary_contact_name: family.primary_contact_name || '',
      primary_contact_phone: family.primary_contact_phone || '',
      primary_contact_email: family.primary_contact_email || '',
      address: family.address || '',
      notes: family.notes || '',
    } : {
      school_id: schoolId,
      family_name: '',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="family_name">Nom de la famille *</Label>
        <Input
          id="family_name"
          {...register('family_name', { required: 'Le nom est requis' })}
          placeholder="Famille Diarra"
        />
        {errors.family_name && (
          <p className="text-sm text-destructive mt-1">{errors.family_name.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="primary_contact_name">Contact principal</Label>
        <Input
          id="primary_contact_name"
          {...register('primary_contact_name')}
          placeholder="Ali Diarra"
        />
      </div>

      <div>
        <Label htmlFor="primary_contact_phone">Téléphone</Label>
        <Input
          id="primary_contact_phone"
          {...register('primary_contact_phone')}
          placeholder="+33 6 12 34 56 78"
          type="tel"
        />
      </div>

      <div>
        <Label htmlFor="primary_contact_email">Email</Label>
        <Input
          id="primary_contact_email"
          {...register('primary_contact_email')}
          placeholder="contact@famille.fr"
          type="email"
        />
      </div>

      <div>
        <Label htmlFor="address">Adresse</Label>
        <Textarea
          id="address"
          {...register('address')}
          placeholder="123 Rue de la Paix, Porte 75"
          rows={2}
        />
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          {...register('notes')}
          placeholder="Informations complémentaires..."
          rows={3}
        />
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit">
          {family ? 'Mettre à jour' : 'Créer'}
        </Button>
      </div>
    </form>
  );
};
