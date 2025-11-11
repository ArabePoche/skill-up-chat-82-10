import React, { useState } from 'react';
import { X, Plus, Calendar, Building2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserSchool, useSchoolYears, useCreateSchool, useCreateSchoolYear, useUpdateSchoolYear, SchoolType } from '../hooks/useSchool';
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
  const { data: schoolYears = [] } = useSchoolYears(school?.id);
  const createSchool = useCreateSchool();
  const createSchoolYear = useCreateSchoolYear();
  const updateSchoolYear = useUpdateSchoolYear();
  const updateSchool = useUpdateSchool();

  const [schoolName, setSchoolName] = useState('');
  const [schoolDescription, setSchoolDescription] = useState('');
  const [schoolType, setSchoolType] = useState<SchoolType>('physical');
  const [yearLabel, setYearLabel] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showYearForm, setShowYearForm] = useState(false);
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

  const handleCreateYear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school?.id) return;

    await createSchoolYear.mutateAsync({
      school_id: school.id,
      year_label: yearLabel,
      start_date: startDate,
      end_date: endDate,
    });

    setYearLabel('');
    setStartDate('');
    setEndDate('');
    setShowYearForm(false);
  };

  const handleToggleActiveYear = async (yearId: string, currentStatus: boolean) => {
    if (!school?.id) return;

    // Désactiver toutes les autres années d'abord
    if (!currentStatus) {
      const activeYears = schoolYears.filter(y => y.is_active && y.id !== yearId);
      for (const year of activeYears) {
        await updateSchoolYear.mutateAsync({
          id: year.id,
          school_id: school.id,
          is_active: false,
        });
      }
    }

    // Activer/désactiver l'année sélectionnée
    await updateSchoolYear.mutateAsync({
      id: yearId,
      school_id: school.id,
      is_active: !currentStatus,
    });
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

                {/* Liste des années scolaires */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">
                      {t('school.schoolYears', { defaultValue: 'Années scolaires' })}
                    </h3>
                    <Button
                      onClick={() => setShowYearForm(!showYearForm)}
                      size="sm"
                      variant="outline"
                    >
                      <Plus size={16} className="mr-2" />
                      {t('school.addYear', { defaultValue: 'Ajouter' })}
                    </Button>
                  </div>

                  {showYearForm && (
                    <form onSubmit={handleCreateYear} className="space-y-4 p-4 bg-muted rounded-lg mb-4">
                      <div>
                        <Label htmlFor="yearLabel">{t('school.yearLabel', { defaultValue: 'Libellé' })}</Label>
                        <Input
                          id="yearLabel"
                          value={yearLabel}
                          onChange={(e) => setYearLabel(e.target.value)}
                          placeholder="2024-2025"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="startDate">{t('school.startDate', { defaultValue: 'Date de début' })}</Label>
                          <Input
                            id="startDate"
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="endDate">{t('school.endDate', { defaultValue: 'Date de fin' })}</Label>
                          <Input
                            id="endDate"
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" disabled={createSchoolYear.isPending}>
                          {t('school.create', { defaultValue: 'Créer' })}
                        </Button>
                        <Button type="button" variant="outline" onClick={() => setShowYearForm(false)}>
                          {t('common.cancel', { defaultValue: 'Annuler' })}
                        </Button>
                      </div>
                    </form>
                  )}

                  <div className="space-y-2">
                    {schoolYears.map((year) => (
                      <div
                        key={year.id}
                        className={`p-4 rounded-lg border-2 transition-colors ${
                          year.is_active
                            ? 'border-primary bg-primary/5'
                            : 'border-border bg-background'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Calendar size={20} className={year.is_active ? 'text-primary' : 'text-muted-foreground'} />
                            <div>
                              <h4 className="font-semibold">{year.year_label}</h4>
                              <p className="text-sm text-muted-foreground">
                                {new Date(year.start_date).toLocaleDateString()} - {new Date(year.end_date).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <Button
                            onClick={() => handleToggleActiveYear(year.id, year.is_active)}
                            variant={year.is_active ? 'default' : 'outline'}
                            size="sm"
                          >
                            {year.is_active ? t('school.active', { defaultValue: 'Active' }) : t('school.activate', { defaultValue: 'Activer' })}
                          </Button>
                        </div>
                      </div>
                    ))}
                    {schoolYears.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        {t('school.noYears', { defaultValue: 'Aucune année scolaire créée' })}
                      </p>
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
