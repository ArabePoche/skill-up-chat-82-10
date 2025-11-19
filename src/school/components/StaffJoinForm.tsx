import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from 'react-i18next';

/**
 * Formulaire de pré-inscription pour le personnel scolaire
 * Administration, comptabilité, surveillance, etc.
 */
interface StaffJoinFormProps {
  onSubmit: (data: { 
    message: string;
    position: string;
    department: string;
  }) => void;
  isPending: boolean;
}

const StaffJoinForm: React.FC<StaffJoinFormProps> = ({ onSubmit, isPending }) => {
  const { t } = useTranslation();
  const [message, setMessage] = useState('');
  const [position, setPosition] = useState('');
  const [department, setDepartment] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ message, position, department });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="department">
          {t('school.department', { defaultValue: 'Département' })} *
        </Label>
        <Select value={department} onValueChange={setDepartment} required>
          <SelectTrigger id="department">
            <SelectValue placeholder={t('school.selectDepartment', { defaultValue: 'Sélectionner le département' })} />
          </SelectTrigger>
          <SelectContent className="z-[70] bg-background">
            <SelectItem value="administration">
              {t('school.administration', { defaultValue: 'Administration' })}
            </SelectItem>
            <SelectItem value="accounting">
              {t('school.accounting', { defaultValue: 'Comptabilité' })}
            </SelectItem>
            <SelectItem value="supervision">
              {t('school.supervision', { defaultValue: 'Surveillance' })}
            </SelectItem>
            <SelectItem value="maintenance">
              {t('school.maintenance', { defaultValue: 'Maintenance' })}
            </SelectItem>
            <SelectItem value="library">
              {t('school.library', { defaultValue: 'Bibliothèque/CDI' })}
            </SelectItem>
            <SelectItem value="canteen">
              {t('school.canteen', { defaultValue: 'Cantine' })}
            </SelectItem>
            <SelectItem value="other">
              {t('school.other', { defaultValue: 'Autre' })}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="position">
          {t('school.position', { defaultValue: 'Poste' })} *
        </Label>
        <Input
          id="position"
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          placeholder={t('school.positionPlaceholder', { defaultValue: 'Secrétaire, surveillant, comptable...' })}
          required
        />
      </div>

      <div>
        <Label htmlFor="message">{t('school.message', { defaultValue: 'Message (optionnel)' })}</Label>
        <Textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t('school.staffMessagePlaceholder', { defaultValue: 'Présentez votre expérience...' })}
          rows={3}
        />
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending 
          ? t('common.sending', { defaultValue: 'Envoi...' })
          : t('common.send', { defaultValue: 'Envoyer' })}
      </Button>
    </form>
  );
};

export default StaffJoinForm;
