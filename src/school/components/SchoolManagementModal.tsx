import React, { useState, useEffect } from 'react';
import { X, Building2, Edit2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: school, isLoading: isLoadingSchool } = useUserSchool(user?.id);
  const createSchool = useCreateSchool();
  const updateSchool = useUpdateSchool();

  const [schoolName, setSchoolName] = useState('');
  const [schoolDescription, setSchoolDescription] = useState('');
  const [schoolType, setSchoolType] = useState<SchoolType>('physical');
  const [isEditing, setIsEditing] = useState(false);

  // Charger les données de l'école existante quand on passe en mode édition
  useEffect(() => {
    if (school && isEditing) {
      setSchoolName(school.name || '');
      setSchoolDescription(school.description || '');
      setSchoolType(school.school_type || 'physical');
    }
  }, [school, isEditing]);

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

  const handleUpdateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school?.id) return;
    
    await updateSchool.mutateAsync({
      id: school.id,
      name: schoolName,
      description: schoolDescription,
      schoolType: schoolType,
    });
    
    setIsEditing(false);
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
                    <SelectContent className="z-50 bg-background">
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
            ) : isEditing ? (
              /* Formulaire de modification */
              <form onSubmit={handleUpdateSchool} className="space-y-4">
                <div>
                  <Label htmlFor="editSchoolName">{t('school.name', { defaultValue: 'Nom de l\'école' })}</Label>
                  <Input
                    id="editSchoolName"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    placeholder={t('school.namePlaceholder', { defaultValue: 'Mon école' })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="editSchoolDescription">{t('school.description', { defaultValue: 'Description' })}</Label>
                  <Textarea
                    id="editSchoolDescription"
                    value={schoolDescription}
                    onChange={(e) => setSchoolDescription(e.target.value)}
                    placeholder={t('school.descriptionPlaceholder', { defaultValue: 'Description de votre école...' })}
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="editSchoolType">{t('school.type', { defaultValue: 'Type d\'école' })}</Label>
                  <Select value={schoolType} onValueChange={(value) => setSchoolType(value as SchoolType)}>
                    <SelectTrigger id="editSchoolType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-50 bg-background">
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
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1" disabled={updateSchool.isPending}>
                    {updateSchool.isPending ? t('common.saving', { defaultValue: 'Enregistrement...' }) : t('common.save', { defaultValue: 'Enregistrer' })}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                    {t('common.cancel', { defaultValue: 'Annuler' })}
                  </Button>
                </div>
              </form>
            ) : (
              /* Affichage des informations de l'école */
              <div className="space-y-6">
                <div className="p-4 bg-muted rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 
                      className="text-xl font-semibold cursor-pointer hover:text-primary transition-colors" 
                      onClick={() => {
                        onClose();
                        navigate('/school');
                      }}
                      title="Cliquer pour ouvrir le School OS"
                    >
                      {school.name}
                    </h3>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      {t('common.modify', { defaultValue: 'Modifier' })}
                    </Button>
                  </div>
                  
                  {school.description && (
                    <p className="text-muted-foreground">{school.description}</p>
                  )}
                  
                  <div className="flex items-center gap-2 pt-3 border-t border-border">
                    <Building2 size={16} className="text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {t('school.type', { defaultValue: 'Type d\'école' })}:
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {school.school_type === 'virtual' && t('school.virtual', { defaultValue: 'Virtuel' })}
                      {school.school_type === 'physical' && t('school.physical', { defaultValue: 'Physique' })}
                      {school.school_type === 'both' && t('school.both', { defaultValue: 'Virtuel et Physique' })}
                    </span>
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
