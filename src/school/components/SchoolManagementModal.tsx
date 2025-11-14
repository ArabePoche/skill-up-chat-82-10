import React, { useState } from 'react';
import { X, Building2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserSchool, useCreateSchool, SchoolType } from '../hooks/useSchool';
import { useUpdateSchool } from '../hooks/useUpdateSchool';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from 'react-i18next';

interface SchoolManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SchoolManagementModal: React.FC<SchoolManagementModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: school, isLoading: isLoadingSchool } = useUserSchool(user?.id);
  const createSchool = useCreateSchool();
  const updateSchool = useUpdateSchool();

  const [schoolName, setSchoolName] = useState('');
  const [schoolDescription, setSchoolDescription] = useState('');
  const [schoolType, setSchoolType] = useState<SchoolType>('physical');
  const [isEditingSchoolType, setIsEditingSchoolType] = useState(false);

  if (!isOpen) return null;

  const handleCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    await createSchool.mutateAsync({
      name: schoolName,
      description: schoolDescription,
      schoolType: schoolType,
      userId: user.id,
    });

    setSchoolName('');
    setSchoolDescription('');
    setSchoolType('physical');
  };

  const handleUpdateSchoolType = async (newType: SchoolType) => {
    if (!school?.id) return;
    
    await updateSchool.mutateAsync({
      id: school.id,
      schoolType: newType,
    });
    
    setIsEditingSchoolType(false);
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[90vh] bg-background rounded-lg shadow-xl z-50">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-2xl font-bold">
            {school ? t('school.manageSchool', { defaultValue: 'Gérer mon école' }) : t('school.createSchool', { defaultValue: 'Créer mon école' })}
          </h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <ScrollArea className="max-h-[calc(90vh-80px)]">
          <div className="p-6 space-y-6">
            {!school ? (
              /* Formulaire de création d'école */
              <form onSubmit={handleCreateSchool} className="space-y-4">
                <div>
                  <Label htmlFor="schoolName">{t('school.name', { defaultValue: 'Nom de l\'école' })}</Label>
                  <Input
                    id="schoolName"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    placeholder={t('school.namePlaceholder', { defaultValue: 'Mon école' })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="schoolDescription">{t('school.description', { defaultValue: 'Description' })}</Label>
                  <Textarea
                    id="schoolDescription"
                    value={schoolDescription}
                    onChange={(e) => setSchoolDescription(e.target.value)}
                    placeholder={t('school.descriptionPlaceholder', { defaultValue: 'Description de votre école...' })}
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="schoolType">{t('school.type', { defaultValue: 'Type d\'école' })} *</Label>
                  <Select value={schoolType} onValueChange={(value) => setSchoolType(value as SchoolType)} required>
                    <SelectTrigger id="schoolType">
                      <SelectValue placeholder={t('school.selectType', { defaultValue: 'Sélectionner le type' })} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="virtual">
                        {t('school.virtual', { defaultValue: 'Virtuel' })}
                      </SelectItem>
                      <SelectItem value="physical">
                        {t('school.physical', { defaultValue: 'Physique' })}
                      </SelectItem>
                      <SelectItem value="both">
                        {t('school.both', { defaultValue: 'Virtuel et Physique' })}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={createSchool.isPending}>
                  {createSchool.isPending ? t('common.creating', { defaultValue: 'Création...' }) : t('school.create', { defaultValue: 'Créer l\'école' })}
                </Button>
              </form>
            ) : (
              /* Gestion de l'école existante */
              <div className="space-y-6">
                {/* Informations de l'école */}
                <div className="p-4 bg-muted rounded-lg space-y-3">
                  <h3 className="text-xl font-semibold mb-2">{school.name}</h3>
                  {school.description && (
                    <p className="text-muted-foreground">{school.description}</p>
                  )}
                  
                  {/* Type d'école */}
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <div className="flex items-center gap-2">
                      <Building2 size={16} className="text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {t('school.type', { defaultValue: 'Type d\'école' })}:
                      </span>
                      {!isEditingSchoolType && (
                        <span className="text-sm text-muted-foreground">
                          {school.school_type === 'virtual' && t('school.virtual', { defaultValue: 'Virtuel' })}
                          {school.school_type === 'physical' && t('school.physical', { defaultValue: 'Physique' })}
                          {school.school_type === 'both' && t('school.both', { defaultValue: 'Virtuel et Physique' })}
                        </span>
                      )}
                    </div>
                    
                    {!isEditingSchoolType ? (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setIsEditingSchoolType(true)}
                      >
                        {t('common.modify', { defaultValue: 'Modifier' })}
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Select 
                          value={school.school_type} 
                          onValueChange={(value) => handleUpdateSchoolType(value as SchoolType)}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="virtual">
                              {t('school.virtual', { defaultValue: 'Virtuel' })}
                            </SelectItem>
                            <SelectItem value="physical">
                              {t('school.physical', { defaultValue: 'Physique' })}
                            </SelectItem>
                            <SelectItem value="both">
                              {t('school.both', { defaultValue: 'Virtuel et Physique' })}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setIsEditingSchoolType(false)}
                        >
                          {t('common.cancel', { defaultValue: 'Annuler' })}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </>
  );
};

export default SchoolManagementModal;
