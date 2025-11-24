import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from 'react-i18next';

/**
 * Formulaire de pré-inscription pour les enseignants
 * Spécialiste ou Généraliste (avec choix de classe obligatoire pour généraliste)
 */
interface TeacherJoinFormProps {
  onSubmit: (data: { 
    message: string; 
    teacherType: 'specialist' | 'generalist';
    specialty?: string;
    preferredGrade?: string;
  }) => void;
  isPending: boolean;
  availableClasses?: Array<{ id: string; name: string }>;
}

const TeacherJoinForm: React.FC<TeacherJoinFormProps> = ({ onSubmit, isPending, availableClasses = [] }) => {
  const { t } = useTranslation();
  const [message, setMessage] = useState('');
  const [teacherType, setTeacherType] = useState<'specialist' | 'generalist'>('generalist');
  const [specialty, setSpecialty] = useState('');
  const [preferredGrade, setPreferredGrade] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ 
      message, 
      teacherType,
      specialty: teacherType === 'specialist' ? specialty : undefined,
      preferredGrade: teacherType === 'generalist' ? preferredGrade : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="teacherType">
          {t('school.teacherType', { defaultValue: 'Type d\'enseignant' })} *
        </Label>
        <Select 
          value={teacherType} 
          onValueChange={(value) => setTeacherType(value as 'specialist' | 'generalist')}
          required
        >
          <SelectTrigger id="teacherType">
            <SelectValue placeholder={t('school.selectTeacherType', { defaultValue: 'Sélectionner le type' })} />
          </SelectTrigger>
          <SelectContent className="z-[70] bg-background">
            <SelectItem value="generalist">
              {t('school.generalist', { defaultValue: 'Generalist (main teacher)' })}
            </SelectItem>
            <SelectItem value="specialist">
              {t('school.specialist', { defaultValue: 'Specialist (specific subject)' })}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {teacherType === 'specialist' && (
        <div>
          <Label htmlFor="specialty">
            {t('school.specialty', { defaultValue: 'Spécialité' })} *
          </Label>
          <Input
            id="specialty"
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            placeholder={t('school.specialtyPlaceholder', { defaultValue: 'Mathématiques, Français, Histoire...' })}
            required
          />
        </div>
      )}

      {teacherType === 'generalist' && (
        <div>
          <Label htmlFor="preferredGrade">
            {t('school.preferredGrade', { defaultValue: 'Classe souhaitée' })} *
          </Label>
          {availableClasses.length > 0 ? (
            <Select 
              value={preferredGrade} 
              onValueChange={setPreferredGrade}
              required
            >
              <SelectTrigger id="preferredGrade">
                <SelectValue placeholder={t('school.selectClass', { defaultValue: 'Sélectionner une classe' })} />
              </SelectTrigger>
              <SelectContent className="z-[70] bg-background">
                {availableClasses.map((cls) => (
                  <SelectItem key={cls.id} value={cls.name}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              id="preferredGrade"
              value={preferredGrade}
              onChange={(e) => setPreferredGrade(e.target.value)}
              placeholder={t('school.preferredGradePlaceholder', { defaultValue: 'CP, CE1, 6ème...' })}
              required
            />
          )}
        </div>
      )}

      <div>
        <Label htmlFor="message">{t('school.message', { defaultValue: 'Message (optionnel)' })}</Label>
        <Textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t('school.teacherMessagePlaceholder', { defaultValue: 'Présentez votre expérience et vos qualifications...' })}
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

export default TeacherJoinForm;
