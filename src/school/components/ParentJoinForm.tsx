import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from 'react-i18next';
import { Plus, X } from 'lucide-react';

/**
 * Formulaire de pré-inscription pour les parents
 * Permet d'ajouter les informations des enfants
 */
interface Child {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  grade: string;
}

interface ParentJoinFormProps {
  onSubmit: (data: { message: string; children: Child[] }) => void;
  isPending: boolean;
}

const ParentJoinForm: React.FC<ParentJoinFormProps> = ({ onSubmit, isPending }) => {
  const { t } = useTranslation();
  const [message, setMessage] = useState('');
  const [children, setChildren] = useState<Child[]>([
    { id: '1', firstName: '', lastName: '', birthDate: '', grade: '' }
  ]);

  const addChild = () => {
    setChildren([...children, { 
      id: Date.now().toString(), 
      firstName: '', 
      lastName: '', 
      birthDate: '', 
      grade: '' 
    }]);
  };

  const removeChild = (id: string) => {
    if (children.length > 1) {
      setChildren(children.filter(child => child.id !== id));
    }
  };

  const updateChild = (id: string, field: keyof Child, value: string) => {
    setChildren(children.map(child => 
      child.id === id ? { ...child, [field]: value } : child
    ));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ message, children });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold">{t('school.childrenInfo', { defaultValue: 'Informations des enfants' })}</h4>
          <Button type="button" size="sm" variant="outline" onClick={addChild}>
            <Plus className="h-4 w-4 mr-1" />
            {t('school.addChild', { defaultValue: 'Ajouter un enfant' })}
          </Button>
        </div>

        {children.map((child, index) => (
          <div key={child.id} className="p-4 border rounded-lg space-y-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                {t('school.child', { defaultValue: 'Enfant' })} {index + 1}
              </span>
              {children.length > 1 && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => removeChild(child.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor={`firstName-${child.id}`}>
                  {t('school.firstName', { defaultValue: 'Prénom' })} *
                </Label>
                <Input
                  id={`firstName-${child.id}`}
                  value={child.firstName}
                  onChange={(e) => updateChild(child.id, 'firstName', e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor={`lastName-${child.id}`}>
                  {t('school.lastName', { defaultValue: 'Nom' })} *
                </Label>
                <Input
                  id={`lastName-${child.id}`}
                  value={child.lastName}
                  onChange={(e) => updateChild(child.id, 'lastName', e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor={`birthDate-${child.id}`}>
                  {t('school.birthDate', { defaultValue: 'Date de naissance' })} *
                </Label>
                <Input
                  id={`birthDate-${child.id}`}
                  type="date"
                  value={child.birthDate}
                  onChange={(e) => updateChild(child.id, 'birthDate', e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor={`grade-${child.id}`}>
                  {t('school.grade', { defaultValue: 'Niveau souhaité' })} *
                </Label>
                <Input
                  id={`grade-${child.id}`}
                  value={child.grade}
                  onChange={(e) => updateChild(child.id, 'grade', e.target.value)}
                  placeholder={t('school.gradePlaceholder', { defaultValue: 'CP, CE1, 6ème...' })}
                  required
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div>
        <Label htmlFor="message">{t('school.message', { defaultValue: 'Message (optionnel)' })}</Label>
        <Textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t('school.parentMessagePlaceholder', { defaultValue: 'Présentez-vous et expliquez votre demande...' })}
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

export default ParentJoinForm;
