/**
 * Modal de candidature pour les posts de recrutement
 * Inclut : photo, CV auto-détecté, questions motivation/disponibilité, conditions
 */
import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Upload, FileText, X, Camera, CheckCircle2, AlertCircle, User } from 'lucide-react';
import { useSubmitApplication } from '../hooks/useApplications';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';

interface ApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  recruiterId: string;
  sourceId: string;
  sourceType: string;
  postContent?: string;
  /** Documents exigés par le recruteur (ex: ['cv', 'photo', 'diplome']) */
  requiredDocuments?: string[];
  /** Postes disponibles dans cette annonce */
  positions?: string[];
}

/** Noms lisibles des documents */
const DOC_LABELS: Record<string, string> = {
  cv: 'CV',
  lettre_motivation: 'Lettre de motivation',
  diplome: 'Diplôme(s)',
  photo: 'Photo d\'identité',
  carte_identite: 'Carte d\'identité',
  certificat_travail: 'Certificat de travail',
  casier_judiciaire: 'Casier judiciaire',
  permis: 'Permis de conduire',
  references: 'Références professionnelles',
};

export const ApplicationModal: React.FC<ApplicationModalProps> = ({
  isOpen,
  onClose,
  userId,
  recruiterId,
  sourceId,
  sourceType,
  postContent,
  requiredDocuments = [],
  positions = [],
}) => {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [motivation, setMotivation] = useState('');
  const [availableImmediately, setAvailableImmediately] = useState<'yes' | 'no' | ''>('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptDataProcessing, setAcceptDataProcessing] = useState(false);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [existingCvUrl, setExistingCvUrl] = useState<string | null>(null);
  const [existingCvName, setExistingCvName] = useState<string | null>(null);
  const [useExistingCv, setUseExistingCv] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState('');
  const [fetchedPositions, setFetchedPositions] = useState<string[]>([]);
  const [fetchedDocs, setFetchedDocs] = useState<string[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const { mutateAsync: submitApplication, isPending } = useSubmitApplication();

  // Résoudre les positions et documents: props ou fetch depuis recruitment_ads
  const effectivePositions = positions.length > 0 ? positions : fetchedPositions;
  const effectiveDocs = requiredDocuments.length > 0 ? requiredDocuments : fetchedDocs;

  // Fetch recruitment_ad data si non fourni via props
  useEffect(() => {
    if (!isOpen || !sourceId || (positions.length > 0 && requiredDocuments.length > 0)) return;
    const fetchAdData = async () => {
      const { data } = await (supabase
        .from('recruitment_ads' as any)
        .select('positions, required_documents')
        .eq('id', sourceId)
        .maybeSingle() as any);
      if (data) {
        if (data.positions) setFetchedPositions(data.positions);
        if (data.required_documents) setFetchedDocs(data.required_documents);
      }
    };
    fetchAdData();
  }, [isOpen, sourceId, positions.length, requiredDocuments.length]);

  // Vérifier si le candidat a déjà un CV public
  useEffect(() => {
    if (!userId || !isOpen) return;
    const fetchExistingCv = async () => {
      const { data } = await supabase
        .from('public_cvs')
        .select('id, title')
        .eq('user_id', userId)
        .eq('is_public', true)
        .maybeSingle();

      if (data) {
        setExistingCvUrl(`/cv/${data.id}`);
        setExistingCvName(data.title || 'Mon CV');
        setUseExistingCv(true);
      }
    };
    fetchExistingCv();
  }, [userId, isOpen]);

  // Gérer la photo
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCvFile(e.target.files[0]);
      setUseExistingCv(false);
    }
  };

  const handleRemoveFile = () => {
    setCvFile(null);
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const needsPhoto = effectiveDocs.includes('photo');
  const needsCv = effectiveDocs.includes('cv');

  const isFormValid = () => {
    if (!motivation.trim()) return false;
    if (!availableImmediately) return false;
    if (!acceptTerms || !acceptDataProcessing) return false;
    if (needsPhoto && !photoFile) return false;
    if (needsCv && !useExistingCv && !cvFile) return false;
    if (effectivePositions.length > 0 && !selectedPosition) return false;
    return true;
  };

  const handleSubmit = async () => {
    if (!isFormValid()) return;

    try {
      const fullMessage = [
        positions.length > 0 ? `📌 Poste visé : ${selectedPosition}` : '',
        `\n💬 Pourquoi ce poste ?\n${motivation.trim()}`,
        `\n⏰ Disponibilité immédiate : ${availableImmediately === 'yes' ? 'Oui' : 'Non'}`,
        message.trim() ? `\n📝 Message complémentaire :\n${message.trim()}` : '',
        useExistingCv && existingCvUrl ? `\n📄 CV : ${existingCvUrl}` : '',
      ].filter(Boolean).join('\n');

      await submitApplication({
        userId,
        recruiterId,
        sourceId,
        sourceType,
        message: fullMessage,
        cvFile: cvFile || undefined,
        photoFile: photoFile || undefined,
      });
      
      // Réinitialiser et fermer
      setMessage('');
      setMotivation('');
      setAvailableImmediately('');
      setAcceptTerms(false);
      setAcceptDataProcessing(false);
      setCvFile(null);
      setPhotoFile(null);
      setPhotoPreview(null);
      setSelectedPosition('');
      onClose();
    } catch (error) {
      console.error('Erreur lors de la soumission:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Postuler à cette offre</DialogTitle>
          <DialogDescription>
            Complétez votre candidature ci-dessous
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Extrait du post */}
          {postContent && (
            <div className="bg-muted p-3 rounded-md">
              <p className="text-sm text-muted-foreground line-clamp-3">{postContent}</p>
            </div>
          )}

          {/* Documents requis par le recruteur */}
          {requiredDocuments.length > 0 && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
              <p className="text-xs font-semibold text-primary mb-1.5 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                Documents requis par le recruteur
              </p>
              <div className="flex flex-wrap gap-1">
                {requiredDocuments.map(doc => (
                  <Badge key={doc} variant="outline" className="text-[10px]">
                    {DOC_LABELS[doc] || doc}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Sélection du poste si plusieurs */}
          {positions.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Poste visé *</Label>
              <RadioGroup value={selectedPosition} onValueChange={setSelectedPosition}>
                {positions.map(pos => (
                  <div key={pos} className="flex items-center space-x-2">
                    <RadioGroupItem value={pos} id={`pos-${pos}`} />
                    <Label htmlFor={`pos-${pos}`} className="text-sm cursor-pointer">{pos}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          {/* Photo du candidat */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">
              Photo du candidat {needsPhoto ? '*' : '(recommandé)'}
            </Label>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              capture="user"
              className="hidden"
              onChange={handlePhotoChange}
            />
            {!photoPreview ? (
              <div
                className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => photoInputRef.current?.click()}
              >
                <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center mb-2">
                  <Camera className="w-7 h-7 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-primary">Ajouter une photo</p>
                <p className="text-[10px] text-muted-foreground mt-1">Photo d'identité ou portrait professionnel</p>
              </div>
            ) : (
              <div className="flex items-center gap-3 bg-muted p-3 rounded-lg">
                <img src={photoPreview} alt="Photo candidat" className="w-16 h-16 rounded-full object-cover border-2 border-primary/20" />
                <div className="flex-1">
                  <p className="text-sm font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Photo ajoutée
                  </p>
                  <p className="text-xs text-muted-foreground">{photoFile?.name}</p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={handleRemovePhoto}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Question : Pourquoi voulez-vous ce poste ? */}
          <div className="space-y-2">
            <Label htmlFor="motivation" className="text-sm font-semibold">
              Pourquoi voulez-vous ce poste ? *
            </Label>
            <Textarea
              id="motivation"
              placeholder="Expliquez votre motivation, vos qualifications pertinentes..."
              value={motivation}
              onChange={(e) => setMotivation(e.target.value)}
              className="min-h-[120px]"
              maxLength={1000}
            />
            <p className="text-[10px] text-muted-foreground text-right">{motivation.length}/1000</p>
          </div>

          {/* Question : Êtes-vous disponible immédiatement ? */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Êtes-vous disponible immédiatement ? *</Label>
            <RadioGroup value={availableImmediately} onValueChange={(v) => setAvailableImmediately(v as 'yes' | 'no')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="available-yes" />
                <Label htmlFor="available-yes" className="text-sm cursor-pointer">Oui, je suis disponible</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="available-no" />
                <Label htmlFor="available-no" className="text-sm cursor-pointer">Non, pas immédiatement</Label>
              </div>
            </RadioGroup>
          </div>

          {/* CV - auto-détection ou upload */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">
              CV {needsCv ? '*' : '(optionnel)'}
            </Label>

            {/* CV existant détecté */}
            {existingCvUrl && (
              <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">CV détecté : {existingCvName}</p>
                  <p className="text-[10px] text-green-600 dark:text-green-500">Votre CV public sera utilisé automatiquement</p>
                </div>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <Checkbox checked={useExistingCv} onCheckedChange={(v) => setUseExistingCv(!!v)} />
                  <span className="text-xs">Utiliser</span>
                </label>
              </div>
            )}

            {/* Upload manuel de CV */}
            {(!useExistingCv || !existingCvUrl) && (
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                {!cvFile ? (
                  <div className="text-center">
                    <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
                    <div className="mt-2">
                      <Label htmlFor="cv-upload" className="cursor-pointer">
                        <span className="text-sm font-semibold text-primary">
                          Cliquez pour téléverser votre CV
                        </span>
                      </Label>
                      <Input
                        id="cv-upload"
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        PDF, DOC, DOCX (max 5 MB)
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-muted p-3 rounded">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      <div>
                        <p className="text-sm font-medium">{cvFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(cvFile.size)}
                        </p>
                      </div>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={handleRemoveFile}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Message complémentaire */}
          <div className="space-y-2">
            <Label htmlFor="message" className="text-sm font-semibold">Message complémentaire</Label>
            <Textarea
              id="message"
              placeholder="Informations supplémentaires (optionnel)..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[80px]"
              maxLength={500}
            />
          </div>

          {/* Cases à cocher obligatoires */}
          <div className="space-y-3 bg-muted/30 rounded-lg p-4 border">
            <label className="flex items-start gap-2 cursor-pointer">
              <Checkbox
                checked={acceptTerms}
                onCheckedChange={(v) => setAcceptTerms(!!v)}
                className="mt-0.5"
              />
              <span className="text-xs leading-relaxed">
                J'accepte les <span className="text-primary font-medium">conditions générales d'utilisation</span> et je certifie que les informations fournies sont exactes. *
              </span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <Checkbox
                checked={acceptDataProcessing}
                onCheckedChange={(v) => setAcceptDataProcessing(!!v)}
                className="mt-0.5"
              />
              <span className="text-xs leading-relaxed">
                J'autorise le traitement de mes <span className="text-primary font-medium">données personnelles</span> dans le cadre de cette candidature. *
              </span>
            </label>
          </div>

          {/* Boutons d'action */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isPending}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isPending || !isFormValid()}
            >
              {isPending ? 'Envoi...' : 'Envoyer ma candidature'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
