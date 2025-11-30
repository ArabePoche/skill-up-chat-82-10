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
    subjectId?: string;
    subjectName?: string;
    classId?: string;
    className?: string;
  }) => void;
  isPending: boolean;
  availableClasses?: Array<{ id: string; name: string }>;
  availableSubjects?: Array<{ id: string; name: string }>;
}

const TeacherJoinForm: React.FC<TeacherJoinFormProps> = ({ 
  onSubmit, 
  isPending, 
  availableClasses = [],
  availableSubjects = []
}) => {
  const { t } = useTranslation();
  const [message, setMessage] = useState('');
  const [teacherType, setTeacherType] = useState<'specialist' | 'generalist'>('generalist');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [customSpecialty, setCustomSpecialty] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const selectedClass = availableClasses.find(c => c.id === selectedClassId);
    const selectedSubject = availableSubjects.find(s => s.id === selectedSubjectId);
    
    onSubmit({ 
      message, 
      teacherType,
      // Pour spécialiste: soit une matière existante, soit une spécialité personnalisée
      subjectId: teacherType === 'specialist' ? selectedSubjectId : undefined,
      subjectName: teacherType === 'specialist' ? selectedSubject?.name : undefined,
      specialty: teacherType === 'specialist' && !selectedSubjectId ? customSpecialty : undefined,
      // Pour généraliste: la classe sélectionnée
      classId: teacherType === 'generalist' ? selectedClassId : undefined,
      className: teacherType === 'generalist' ? selectedClass?.name : undefined,
    });
  };

  const isFormValid = () => {
    if (teacherType === 'generalist') {
      return selectedClassId !== '';
    } else {
      return selectedSubjectId !== '' || customSpecialty !== '';
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="teacherType">
          {t('school.teacherType', { defaultValue: 'Type d\'enseignant' })} *
        </Label>
        <Select 
          value={teacherType} 
          onValueChange={(value) => {
            setTeacherType(value as 'specialist' | 'generalist');
            setSelectedClassId('');
            setSelectedSubjectId('');
            setCustomSpecialty('');
          }}
          required
        >
          <SelectTrigger id="teacherType">
            <SelectValue placeholder={t('school.selectTeacherType', { defaultValue: 'Sélectionner le type' })} />
          </SelectTrigger>
          <SelectContent className="z-[70] bg-background">
            <SelectItem value="generalist">
              {t('school.generalist', { defaultValue: 'Généraliste (professeur principal)' })}
            </SelectItem>
            <SelectItem value="specialist">
              {t('school.specialist', { defaultValue: 'Spécialiste (matière spécifique)' })}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {teacherType === 'specialist' && (
        <div className="space-y-3">
          {availableSubjects.length > 0 ? (
            <div>
              <Label htmlFor="subject">
                {t('school.selectSubject', { defaultValue: 'Matière enseignée' })} *
              </Label>
              <Select 
                value={selectedSubjectId} 
                onValueChange={(value) => {
                  setSelectedSubjectId(value);
                  setCustomSpecialty('');
                }}
              >
                <SelectTrigger id="subject">
                  <SelectValue placeholder={t('school.selectSubjectPlaceholder', { defaultValue: 'Sélectionner une matière' })} />
                </SelectTrigger>
                <SelectContent className="z-[70] bg-background">
                  {availableSubjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {t('school.orEnterCustom', { defaultValue: 'Ou entrez une spécialité personnalisée ci-dessous' })}
              </p>
            </div>
          ) : null}
          
          <div>
            <Label htmlFor="customSpecialty">
              {availableSubjects.length > 0 
                ? t('school.customSpecialty', { defaultValue: 'Autre spécialité' })
                : t('school.specialty', { defaultValue: 'Spécialité' }) + ' *'
              }
            </Label>
            <Input
              id="customSpecialty"
              value={customSpecialty}
              onChange={(e) => {
                setCustomSpecialty(e.target.value);
                if (e.target.value) setSelectedSubjectId('');
              }}
              placeholder={t('school.specialtyPlaceholder', { defaultValue: 'Mathématiques, Français, Histoire...' })}
              disabled={!!selectedSubjectId}
            />
          </div>
        </div>
      )}

      {teacherType === 'generalist' && (
        <div>
          <Label htmlFor="class">
            {t('school.assignedClass', { defaultValue: 'Classe assignée' })} *
          </Label>
          {availableClasses.length > 0 ? (
            <>
              <Select 
                value={selectedClassId} 
                onValueChange={setSelectedClassId}
                required
              >
                <SelectTrigger id="class">
                  <SelectValue placeholder={t('school.selectClass', { defaultValue: 'Sélectionner une classe' })} />
                </SelectTrigger>
                <SelectContent className="z-[70] bg-background">
                  {availableClasses.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {t('school.generalistClassInfo', { defaultValue: 'En tant que généraliste, vous serez le professeur principal de cette classe' })}
              </p>
            </>
          ) : (
            <div className="p-3 bg-muted rounded-md text-sm text-muted-foreground">
              {t('school.noClassesAvailable', { defaultValue: 'Aucune classe disponible dans cette école pour le moment.' })}
            </div>
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

      <Button type="submit" className="w-full" disabled={isPending || !isFormValid()}>
        {isPending 
          ? t('common.sending', { defaultValue: 'Envoi...' })
          : t('common.send', { defaultValue: 'Envoyer' })}
      </Button>
    </form>
  );
};

export default TeacherJoinForm;
