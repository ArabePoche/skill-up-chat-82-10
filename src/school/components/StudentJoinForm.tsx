import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from 'react-i18next';

/**
 * Formulaire de pré-inscription pour les élèves
 */
interface StudentJoinFormProps {
  onSubmit: (data: { 
    message: string;
    birthDate: string;
    grade: string;
    parentName: string;
    parentPhone: string;
    parentEmail: string;
  }) => void;
  isPending: boolean;
  availableClasses?: Array<{ id: string; name: string }>;
}

const StudentJoinForm: React.FC<StudentJoinFormProps> = ({ onSubmit, isPending, availableClasses = [] }) => {
  const { t } = useTranslation();
  const [message, setMessage] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [grade, setGrade] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [parentEmail, setParentEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ 
      message,
      birthDate,
      grade,
      parentName,
      parentPhone,
      parentEmail,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-4">
        <h4 className="font-semibold">{t('school.studentInfo', { defaultValue: 'Informations de l\'élève' })}</h4>

        <div>
          <Label htmlFor="birthDate">
            {t('school.birthDate', { defaultValue: 'Date de naissance' })} *
          </Label>
          <Input
            id="birthDate"
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            required
          />
        </div>

        <div>
          <Label htmlFor="grade">
            {t('school.grade', { defaultValue: 'Classe souhaitée' })} *
          </Label>
          {availableClasses.length > 0 ? (
            <Select 
              value={grade} 
              onValueChange={setGrade}
              required
            >
              <SelectTrigger id="grade">
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
              id="grade"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              placeholder={t('school.gradePlaceholder', { defaultValue: 'CP, CE1, 6ème...' })}
              required
            />
          )}
        </div>
      </div>

      <div className="space-y-4 pt-4 border-t">
        <h4 className="font-semibold">{t('school.parentContact', { defaultValue: 'Contact du parent/tuteur' })}</h4>

        <div>
          <Label htmlFor="parentName">
            {t('school.parentName', { defaultValue: 'Nom du parent/tuteur' })} *
          </Label>
          <Input
            id="parentName"
            value={parentName}
            onChange={(e) => setParentName(e.target.value)}
            placeholder={t('school.parentNamePlaceholder', { defaultValue: 'Prénom et nom' })}
            required
          />
        </div>

        <div>
          <Label htmlFor="parentPhone">
            {t('school.parentPhone', { defaultValue: 'Téléphone du parent' })} *
          </Label>
          <Input
            id="parentPhone"
            type="tel"
            value={parentPhone}
            onChange={(e) => setParentPhone(e.target.value)}
            placeholder={t('school.phonePlaceholder', { defaultValue: '+33 1 23 45 67 89' })}
            required
          />
        </div>

        <div>
          <Label htmlFor="parentEmail">
            {t('school.parentEmail', { defaultValue: 'Email du parent' })} *
          </Label>
          <Input
            id="parentEmail"
            type="email"
            value={parentEmail}
            onChange={(e) => setParentEmail(e.target.value)}
            placeholder={t('school.emailPlaceholder', { defaultValue: 'parent@email.fr' })}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="message">{t('school.message', { defaultValue: 'Message (optionnel)' })}</Label>
        <Textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t('school.studentMessagePlaceholder', { defaultValue: 'Motivations, centres d\'intérêt...' })}
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

export default StudentJoinForm;
