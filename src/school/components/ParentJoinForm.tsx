import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from 'react-i18next';
import { Plus, X, Key, User, Phone, Mail, MapPin, Briefcase, Camera, Loader2 } from 'lucide-react';
import { useFileUpload } from '@/hooks/useFileUpload';

/**
 * Formulaire de demande d'adhésion pour les parents
 * Collecte les informations du parent et de ses enfants
 */
interface Child {
  id: string;
  firstName: string;
  lastName: string;
  age: string;
  grade: string;
}

export interface ParentFormData {
  parentName: string;
  phone: string;
  email: string;
  relationship: string;
  parentalCode: string;
  photoUrl: string;
  function: string;
  address: string;
  children: Child[];
}

interface ParentJoinFormProps {
  onSubmit: (data: ParentFormData) => void;
  isPending: boolean;
}

const ParentJoinForm: React.FC<ParentJoinFormProps> = ({ onSubmit, isPending }) => {
  const { t } = useTranslation();
  const { uploadFile, isUploading } = useFileUpload();
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [parentName, setParentName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [relationship, setRelationship] = useState('');
  const [parentalCode, setParentalCode] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoPreview, setPhotoPreview] = useState('');
  const [functionValue, setFunctionValue] = useState('');
  const [address, setAddress] = useState('');
  const [children, setChildren] = useState<Child[]>([
    { id: '1', firstName: '', lastName: '', age: '', grade: '' }
  ]);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Aperçu local
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);

    // Upload vers le stockage
    try {
      const result = await uploadFile(file, 'lesson_discussion_files');
      if (result?.fileUrl) {
        setPhotoUrl(result.fileUrl);
      }
    } catch {
      // En cas d'erreur d'upload, utiliser le base64 comme fallback
      const reader2 = new FileReader();
      reader2.onloadend = () => setPhotoUrl(reader2.result as string);
      reader2.readAsDataURL(file);
    }
  };

  const addChild = () => {
    setChildren([...children, {
      id: Date.now().toString(),
      firstName: '',
      lastName: '',
      age: '',
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
    onSubmit({
      parentName,
      phone,
      email,
      relationship,
      parentalCode,
      photoUrl,
      function: functionValue,
      address,
      children,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Photo du parent */}
      <div>
        <Label className="flex items-center gap-2 mb-2">
          <Camera className="w-4 h-4" />
          {t('school.parentPhoto', { defaultValue: 'Photo du parent' })} *
        </Label>
        <div className="flex items-center gap-4">
          <div
            className="h-20 w-20 rounded-full border-2 border-dashed border-muted-foreground/40 flex items-center justify-center cursor-pointer hover:border-primary transition-colors overflow-hidden bg-muted"
            onClick={() => photoInputRef.current?.click()}
          >
            {photoPreview ? (
              <img src={photoPreview} alt="preview" className="h-full w-full object-cover" />
            ) : (
              <Camera className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <div>
            <Button type="button" variant="outline" size="sm" onClick={() => photoInputRef.current?.click()} disabled={isUploading}>
              {isUploading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />{t('common.uploading', { defaultValue: 'Envoi...' })}</> : t('school.choosePhoto', { defaultValue: 'Choisir une photo' })}
            </Button>
            <p className="text-xs text-muted-foreground mt-1">{t('school.photoRequired', { defaultValue: 'Photo obligatoire' })}</p>
          </div>
        </div>
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePhotoChange}
          required={!photoUrl}
        />
        {/* Champ caché pour valider la présence de la photo */}
        <input type="hidden" value={photoUrl} required />
      </div>

      {/* Nom complet */}
      <div>
        <Label htmlFor="parent-name" className="flex items-center gap-2">
          <User className="w-4 h-4" />
          {t('school.parentName', { defaultValue: 'Nom complet du parent' })} *
        </Label>
        <Input
          id="parent-name"
          value={parentName}
          onChange={(e) => setParentName(e.target.value)}
          placeholder={t('school.parentNamePlaceholder', { defaultValue: 'Prénom et nom' })}
          required
          className="mt-1"
        />
      </div>

      {/* Lien de parenté */}
      <div>
        <Label className="flex items-center gap-2">
          <User className="w-4 h-4" />
          {t('school.relationship', { defaultValue: 'Lien avec les enfants' })} *
        </Label>
        <Select value={relationship} onValueChange={setRelationship} required>
          <SelectTrigger className="mt-1">
            <SelectValue placeholder={t('school.relationshipPlaceholder', { defaultValue: 'Sélectionner...' })} />
          </SelectTrigger>
          <SelectContent className="z-[70] bg-background">
            <SelectItem value="père">{t('school.father', { defaultValue: 'Père' })}</SelectItem>
            <SelectItem value="mère">{t('school.mother', { defaultValue: 'Mère' })}</SelectItem>
            <SelectItem value="tuteur">{t('school.guardian', { defaultValue: 'Tuteur' })}</SelectItem>
            <SelectItem value="tutrice">{t('school.guardianF', { defaultValue: 'Tutrice' })}</SelectItem>
            <SelectItem value="grand-père">{t('school.grandfather', { defaultValue: 'Grand-père' })}</SelectItem>
            <SelectItem value="grand-mère">{t('school.grandmother', { defaultValue: 'Grand-mère' })}</SelectItem>
            <SelectItem value="autre">{t('school.other', { defaultValue: 'Autre' })}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Téléphone */}
      <div>
        <Label htmlFor="parent-phone" className="flex items-center gap-2">
          <Phone className="w-4 h-4" />
          {t('school.phone', { defaultValue: 'Numéro de téléphone' })} *
        </Label>
        <Input
          id="parent-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+33 6 00 00 00 00"
          required
          className="mt-1"
        />
      </div>

      {/* Email */}
      <div>
        <Label htmlFor="parent-email" className="flex items-center gap-2">
          <Mail className="w-4 h-4" />
          {t('school.email', { defaultValue: 'Adresse e-mail' })} *
        </Label>
        <Input
          id="parent-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="exemple@email.com"
          required
          className="mt-1"
        />
      </div>

      {/* Fonction */}
      <div>
        <Label htmlFor="parent-function" className="flex items-center gap-2">
          <Briefcase className="w-4 h-4" />
          {t('school.function', { defaultValue: 'Fonction / Profession' })} *
        </Label>
        <Input
          id="parent-function"
          value={functionValue}
          onChange={(e) => setFunctionValue(e.target.value)}
          placeholder={t('school.functionPlaceholder', { defaultValue: 'Ex: Ingénieur, Médecin, Commerçant...' })}
          required
          className="mt-1"
        />
      </div>

      {/* Adresse */}
      <div>
        <Label htmlFor="parent-address" className="flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          {t('school.address', { defaultValue: 'Adresse' })} *
        </Label>
        <Input
          id="parent-address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder={t('school.addressPlaceholder', { defaultValue: 'Adresse complète' })}
          required
          className="mt-1"
        />
      </div>

      {/* Code parental (obligatoire) */}
      <div>
        <Label htmlFor="parental-code" className="flex items-center gap-2">
          <Key className="w-4 h-4" />
          {t('school.parentalCode', { defaultValue: 'Code parental' })} *
        </Label>
        <Input
          id="parental-code"
          value={parentalCode}
          onChange={(e) => setParentalCode(e.target.value.toUpperCase())}
          placeholder="Ex: FAM-AB12CD"
          required
          className="font-mono mt-1"
        />
        <p className="text-xs text-muted-foreground mt-1">
          {t('school.parentalCodeInfo', { defaultValue: 'Saisissez le code parental fourni par l\'école.' })}
        </p>
      </div>

      {/* Informations des enfants */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold">
            {t('school.childrenInfo', { defaultValue: 'Informations des enfants' })} *
          </h4>
          <Button type="button" size="sm" variant="outline" onClick={addChild}>
            <Plus className="h-4 w-4 mr-1" />
            {t('school.addChild', { defaultValue: 'Ajouter un enfant' })}
          </Button>
        </div>

        {children.map((child, index) => (
          <div key={child.id} className="p-4 border rounded-lg space-y-3">
            <div className="flex items-center justify-between mb-1">
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
                <Label htmlFor={`child-firstName-${child.id}`}>
                  {t('school.firstName', { defaultValue: 'Prénom' })} *
                </Label>
                <Input
                  id={`child-firstName-${child.id}`}
                  value={child.firstName}
                  onChange={(e) => updateChild(child.id, 'firstName', e.target.value)}
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor={`child-lastName-${child.id}`}>
                  {t('school.lastName', { defaultValue: 'Nom' })} *
                </Label>
                <Input
                  id={`child-lastName-${child.id}`}
                  value={child.lastName}
                  onChange={(e) => updateChild(child.id, 'lastName', e.target.value)}
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor={`child-age-${child.id}`}>
                  {t('school.age', { defaultValue: 'Âge' })} *
                </Label>
                <Input
                  id={`child-age-${child.id}`}
                  type="number"
                  min="1"
                  max="25"
                  value={child.age}
                  onChange={(e) => updateChild(child.id, 'age', e.target.value)}
                  placeholder="Ex: 8"
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor={`child-grade-${child.id}`}>
                  {t('school.grade', { defaultValue: 'Classe' })} *
                </Label>
                <Input
                  id={`child-grade-${child.id}`}
                  value={child.grade}
                  onChange={(e) => updateChild(child.id, 'grade', e.target.value)}
                  placeholder={t('school.gradePlaceholder', { defaultValue: 'CP, CE1, 6ème...' })}
                  required
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button type="submit" className="w-full" disabled={isPending || isUploading || !photoUrl}>
        {isPending
          ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />{t('common.sending', { defaultValue: 'Envoi...' })}</>
          : t('school.sendJoinRequest', { defaultValue: "Envoyer la demande d'adhésion" })}
      </Button>
    </form>
  );
};

export default ParentJoinForm;
