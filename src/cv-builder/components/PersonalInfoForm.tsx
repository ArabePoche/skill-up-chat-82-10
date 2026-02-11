/**
 * Formulaire des informations personnelles du CV
 */
import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { PersonalInfo } from '../../types';

interface Props {
  data: PersonalInfo;
  onChange: (data: PersonalInfo) => void;
}

const PersonalInfoForm: React.FC<Props> = ({ data, onChange }) => {
  const update = (field: keyof PersonalInfo, value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Informations personnelles</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Nom complet</Label>
          <Input value={data.fullName} onChange={e => update('fullName', e.target.value)} placeholder="Jean Dupont" />
        </div>
        <div className="space-y-1.5">
          <Label>Titre professionnel</Label>
          <Input value={data.title} onChange={e => update('title', e.target.value)} placeholder="Développeur Full Stack" />
        </div>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input type="email" value={data.email} onChange={e => update('email', e.target.value)} placeholder="jean@email.com" />
        </div>
        <div className="space-y-1.5">
          <Label>Téléphone</Label>
          <Input value={data.phone} onChange={e => update('phone', e.target.value)} placeholder="+33 6 12 34 56 78" />
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <Label>Adresse</Label>
          <Input value={data.address} onChange={e => update('address', e.target.value)} placeholder="Paris, France" />
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <Label>Résumé</Label>
          <Textarea value={data.summary} onChange={e => update('summary', e.target.value)} placeholder="Brève description de votre profil..." rows={3} />
        </div>
      </div>
    </div>
  );
};

export default PersonalInfoForm;
