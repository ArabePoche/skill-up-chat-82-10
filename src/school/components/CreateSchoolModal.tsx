import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useCreateSchool, useCreateSchoolYear, SchoolType } from '../hooks/useSchool';
import { getData } from 'country-list';

/**
 * Modal complet de création d'école
 * Inclut toutes les informations : nom, pays, téléphone, année de création, etc.
 */
interface CreateSchoolModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CreateSchoolModal: React.FC<CreateSchoolModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const createSchool = useCreateSchool();

  const [step, setStep] = useState(1); // Étape 1: école, Étape 2: année scolaire
  const [createdSchoolId, setCreatedSchoolId] = useState<string | null>(null);

  const [schoolName, setSchoolName] = useState('');
  const [schoolDescription, setSchoolDescription] = useState('');
  const [schoolType, setSchoolType] = useState<SchoolType>('physical');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [foundedYear, setFoundedYear] = useState('');
  const [website, setWebsite] = useState('');

  // Champs pour l'année scolaire
  const [yearLabel, setYearLabel] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const countryList = getData().sort((a, b) => a.name.localeCompare(b.name));

  const createSchoolYear = useCreateSchoolYear();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    const result = await createSchool.mutateAsync({
      name: schoolName,
      description: schoolDescription,
      schoolType: schoolType,
      userId: user.id,
      country,
      city,
      address,
      phone,
      email,
      foundedYear: foundedYear ? parseInt(foundedYear) : undefined,
      website,
    });

    // Passer à l'étape 2 avec l'ID de l'école créée
    setCreatedSchoolId(result.id);
    setStep(2);
  };

  const handleSchoolYearSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createdSchoolId) return;

    await createSchoolYear.mutateAsync({
      school_id: createdSchoolId,
      year_label: yearLabel,
      start_date: startDate,
      end_date: endDate,
    });

    // Reset tout et fermer
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setStep(1);
    setCreatedSchoolId(null);
    setSchoolName('');
    setSchoolDescription('');
    setSchoolType('physical');
    setCountry('');
    setCity('');
    setAddress('');
    setPhone('');
    setEmail('');
    setFoundedYear('');
    setWebsite('');
    setYearLabel('');
    setStartDate('');
    setEndDate('');
  };

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/50 z-50 transition-opacity"
        onClick={() => {
          resetForm();
          onClose();
        }}
      />

      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[90vh] bg-background rounded-lg shadow-xl z-50 overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-2xl font-bold">
            {step === 1 
              ? t('school.createSchool', { defaultValue: 'Créer une école' })
              : 'Créer l\'année scolaire'}
          </h2>
          <button 
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          {step === 1 ? (
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Informations de base */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">{t('school.basicInfo', { defaultValue: 'Informations de base' })}</h3>
              
              <div>
                <Label htmlFor="schoolName">{t('school.name', { defaultValue: 'Nom de l\'école' })} *</Label>
                <Input
                  id="schoolName"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder={t('school.namePlaceholder', { defaultValue: 'Mon école' })}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="schoolType">{t('school.type', { defaultValue: 'Type d\'école' })} *</Label>
                <Select value={schoolType} onValueChange={(value) => setSchoolType(value as SchoolType)} required>
                  <SelectTrigger id="schoolType">
                    <SelectValue placeholder={t('school.selectType', { defaultValue: 'Sélectionner le type' })} />
                  </SelectTrigger>
                  <SelectContent className="z-[60] bg-background">
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
            </div>

            {/* Localisation */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">{t('school.location', { defaultValue: 'Localisation' })}</h3>
              
              <div>
                <Label htmlFor="country">{t('school.country', { defaultValue: 'Pays' })} *</Label>
                <Select value={country} onValueChange={setCountry} required>
                  <SelectTrigger id="country">
                    <SelectValue placeholder={t('school.selectCountry', { defaultValue: 'Sélectionner le pays' })} />
                  </SelectTrigger>
                  <SelectContent className="z-[60] bg-background max-h-[200px]">
                    {countryList.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="city">{t('school.city', { defaultValue: 'Ville' })} *</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder={t('school.cityPlaceholder', { defaultValue: 'Paris' })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="address">{t('school.address', { defaultValue: 'Adresse' })}</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={t('school.addressPlaceholder', { defaultValue: '123 Rue de l\'École' })}
                />
              </div>
            </div>

            {/* Contact */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">{t('school.contact', { defaultValue: 'Contact' })}</h3>
              
              <div>
                <Label htmlFor="phone">{t('school.phone', { defaultValue: 'Téléphone' })} *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t('school.phonePlaceholder', { defaultValue: '+33 1 23 45 67 89' })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="email">{t('school.email', { defaultValue: 'Email' })} *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('school.emailPlaceholder', { defaultValue: 'contact@monecole.fr' })}
                  required
                />
              </div>
            </div>

            {/* Informations complémentaires */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">{t('school.additionalInfo', { defaultValue: 'Informations complémentaires' })}</h3>
              
              <div>
                <Label htmlFor="foundedYear">{t('school.foundedYear', { defaultValue: 'Année de création' })}</Label>
                <Input
                  id="foundedYear"
                  type="number"
                  min="1800"
                  max={new Date().getFullYear()}
                  value={foundedYear}
                  onChange={(e) => setFoundedYear(e.target.value)}
                  placeholder={t('school.foundedYearPlaceholder', { defaultValue: '2020' })}
                />
              </div>

              <div>
                <Label htmlFor="website">{t('school.website', { defaultValue: 'Site web' })}</Label>
                <Input
                  id="website"
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder={t('school.websitePlaceholder', { defaultValue: 'https://www.monecole.fr' })}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => {
                resetForm();
                onClose();
              }} className="flex-1">
                {t('common.cancel', { defaultValue: 'Annuler' })}
              </Button>
              <Button type="submit" className="flex-1" disabled={createSchool.isPending}>
                {createSchool.isPending 
                  ? t('common.creating', { defaultValue: 'Création...' }) 
                  : 'Suivant : Année scolaire'}
              </Button>
            </div>
          </form>
          ) : (
            <form onSubmit={handleSchoolYearSubmit} className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="bg-muted/50 p-4 rounded-lg mb-4">
                  <p className="text-sm text-muted-foreground">
                    École créée avec succès ! Créez maintenant votre première année scolaire.
                  </p>
                </div>

                <div>
                  <Label htmlFor="yearLabel">Nom de l'année scolaire *</Label>
                  <Input
                    id="yearLabel"
                    value={yearLabel}
                    onChange={(e) => setYearLabel(e.target.value)}
                    placeholder="Ex: 2024-2025"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="startDate">Date de début *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="endDate">Date de fin *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setStep(1)} 
                  className="flex-1"
                  disabled={createSchoolYear.isPending}
                >
                  Retour
                </Button>
                <Button type="submit" className="flex-1" disabled={createSchoolYear.isPending}>
                  {createSchoolYear.isPending ? 'Création...' : 'Terminer'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
};

export default CreateSchoolModal;
