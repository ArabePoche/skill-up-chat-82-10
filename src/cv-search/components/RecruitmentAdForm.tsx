/**
 * Formulaire de création d'annonce de recrutement avec prévisualisation
 * Inclut : titre, description, compétences, localisation, salaire, contrat, expérience, médias
 * + postes recherchés, adresse complète, documents requis
 */
import React, { useState, useMemo, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import {
  Megaphone,
  Eye,
  MapPin,
  Briefcase,
  Clock,
  DollarSign,
  X,
  Plus,
  Sparkles,
  Users,
  Calendar,
  ArrowLeft,
  Send,
  ImagePlus,
  Loader2,
  FileText,
} from 'lucide-react';
import { estimateReach, estimateDuration, useCreateRecruitmentAd } from '../hooks/useRecruitmentAds';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { compressImage } from '@/utils/imageCompression';
import { toast } from 'sonner';

interface RecruitmentAdFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shopId?: string;
}

const CONTRACT_TYPES = [
  { value: 'CDI', label: 'CDI' },
  { value: 'CDD', label: 'CDD' },
  { value: 'Stage', label: 'Stage' },
  { value: 'Freelance', label: 'Freelance' },
  { value: 'Temps partiel', label: 'Temps partiel' },
];

const EXPERIENCE_LEVELS = [
  { value: 'debutant', label: 'Débutant' },
  { value: 'junior', label: 'Junior (1-2 ans)' },
  { value: 'intermediaire', label: 'Intermédiaire (3-5 ans)' },
  { value: 'senior', label: 'Senior (5+ ans)' },
];

/** Suggestions courantes de documents */
const DOCUMENT_SUGGESTIONS = ['CV', 'Lettre de motivation', 'Diplôme(s)', 'Photo d\'identité', 'Carte d\'identité', 'Certificat de travail', 'Casier judiciaire', 'Permis de conduire', 'Références professionnelles'];

const RecruitmentAdForm: React.FC<RecruitmentAdFormProps> = ({ open, onOpenChange, shopId }) => {
  const { user } = useAuth();
  const createAd = useCreateRecruitmentAd();

  const [step, setStep] = useState<'form' | 'preview'>('form');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [location, setLocation] = useState('');
  const [fullAddress, setFullAddress] = useState('');
  const [salaryRange, setSalaryRange] = useState('');
  const [contractType, setContractType] = useState('CDI');
  const [experienceLevel, setExperienceLevel] = useState('junior');
  const [publishAsPost, setPublishAsPost] = useState(true);
  const [publishAsStatus, setPublishAsStatus] = useState(false);
  const [previewMode, setPreviewMode] = useState<'post' | 'status'>('post');
  const [budget, setBudget] = useState(1000);
  const [mediaFiles, setMediaFiles] = useState<{ url: string; type: 'image' | 'video'; name: string }[]>([]);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const mediaInputRef = useRef<HTMLInputElement>(null);

  // Nouveaux champs
  const [positions, setPositions] = useState<string[]>([]);
  const [positionInput, setPositionInput] = useState('');
  const [requiredDocuments, setRequiredDocuments] = useState<string[]>([]);
  const [docInput, setDocInput] = useState('');

  const reach = useMemo(() => estimateReach(budget), [budget]);
  const duration = useMemo(() => estimateDuration(budget), [budget]);

  const handleMediaSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user?.id) return;

    setIsUploadingMedia(true);
    try {
      for (const file of Array.from(files)) {
        if (mediaFiles.length >= 5) {
          toast.error('Maximum 5 médias par annonce');
          break;
        }

        const isVideo = file.type.startsWith('video/');
        const isImage = file.type.startsWith('image/');
        if (!isVideo && !isImage) {
          toast.error(`${file.name}: type non supporté`);
          continue;
        }

        let uploadFile: File | Blob = file;
        if (isImage) {
          uploadFile = await compressImage(file, { maxSizeMB: 2, maxWidthOrHeight: 1200, quality: 0.8 });
        }

        const ext = file.name.split('.').pop();
        const path = `recruitment-ads/${user.id}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(path, uploadFile, { cacheControl: '3600', upsert: false });

        if (uploadError) {
          toast.error(`Erreur upload: ${uploadError.message}`);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(path);

        setMediaFiles(prev => [...prev, {
          url: publicUrl,
          type: isVideo ? 'video' : 'image',
          name: file.name,
        }]);
      }
      toast.success('Média(s) ajouté(s) !');
    } catch (err: any) {
      toast.error(err.message || 'Erreur upload');
    } finally {
      setIsUploadingMedia(false);
      if (mediaInputRef.current) mediaInputRef.current.value = '';
    }
  };

  const removeMedia = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
  };

  const addSkill = () => {
    const trimmed = skillInput.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
      setSkillInput('');
    }
  };

  const removeSkill = (skill: string) => {
    setSkills(skills.filter(s => s !== skill));
  };

  const addPosition = () => {
    const trimmed = positionInput.trim();
    if (trimmed && !positions.includes(trimmed)) {
      setPositions([...positions, trimmed]);
      setPositionInput('');
    }
  };

  const removePosition = (pos: string) => {
    setPositions(positions.filter(p => p !== pos));
  };

  const addDocument = () => {
    const trimmed = docInput.trim();
    if (trimmed && !requiredDocuments.includes(trimmed)) {
      setRequiredDocuments([...requiredDocuments, trimmed]);
      setDocInput('');
    }
  };

  const removeDocument = (doc: string) => {
    setRequiredDocuments(requiredDocuments.filter(d => d !== doc));
  };

  const handleDocKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addDocument();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSkill();
    }
  };

  const handlePositionKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addPosition();
    }
  };

  const isValid = title.trim().length >= 3 && description.trim().length >= 10 && budget >= 500 && (publishAsPost || publishAsStatus) && positions.length > 0;

  const handleSubmit = async () => {
    if (!user?.id || !isValid) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    const publishType = publishAsPost && publishAsStatus ? 'post' : publishAsPost ? 'post' : 'status';
    try {
      await createAd.mutateAsync({
        owner_id: user.id,
        shop_id: shopId,
        title: title.trim(),
        description: description.trim(),
        skills,
        location: location.trim(),
        salary_range: salaryRange.trim(),
        contract_type: contractType,
        experience_level: experienceLevel,
        media_urls: mediaFiles.map(m => m.url),
        publish_type: publishType,
        publish_as_post: publishAsPost,
        publish_as_status: publishAsStatus,
        budget,
        positions,
        required_documents: requiredDocuments,
        full_address: fullAddress.trim(),
      });
      // Reset
      setTitle('');
      setDescription('');
      setSkills([]);
      setLocation('');
      setFullAddress('');
      setSalaryRange('');
      setBudget(1000);
      setMediaFiles([]);
      setPublishAsPost(true);
      setPublishAsStatus(false);
      setPositions([]);
      setRequiredDocuments(['cv', 'photo']);
      setStep('form');
      onOpenChange(false);
    } catch (err: any) {
      console.error('❌ Erreur soumission annonce:', err);
    }
  };

  const formatBudget = (v: number) => `${v.toLocaleString('fr-FR')} FCFA`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0">
        {step === 'form' ? (
          <>
            <DialogHeader className="p-5 pb-0">
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Megaphone className="w-5 h-5 text-primary" />
                Lancer une annonce de recrutement
              </DialogTitle>
              <DialogDescription className="text-xs">
                Publiez votre offre en Post ou Statut. La portée dépend de votre budget.
              </DialogDescription>
            </DialogHeader>

            <div className="p-5 space-y-4">
              {/* Titre */}
              <div className="space-y-1.5">
                <Label htmlFor="ad-title" className="text-xs font-semibold">Titre de l'offre *</Label>
                <Input
                  id="ad-title"
                  placeholder="Ex: Vendeur expérimenté pour boutique textile"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={100}
                />
              </div>

              {/* Postes recherchés */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Poste(s) recherché(s) *</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Ex: Caissier, Vendeur, Manager..."
                    value={positionInput}
                    onChange={(e) => setPositionInput(e.target.value)}
                    onKeyDown={handlePositionKeyDown}
                    className="flex-1"
                  />
                  <Button type="button" size="sm" variant="outline" onClick={addPosition}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {positions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {positions.map((p) => (
                      <Badge key={p} variant="default" className="gap-1 text-xs">
                        {p}
                        <X className="w-3 h-3 cursor-pointer" onClick={() => removePosition(p)} />
                      </Badge>
                    ))}
                  </div>
                )}
                {positions.length === 0 && (
                  <p className="text-[10px] text-destructive">Ajoutez au moins un poste</p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="ad-desc" className="text-xs font-semibold">Description *</Label>
                <Textarea
                  id="ad-desc"
                  placeholder="Décrivez le poste, les responsabilités, les avantages..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  maxLength={2000}
                />
                <p className="text-[10px] text-muted-foreground text-right">{description.length}/2000</p>
              </div>

              {/* Compétences */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Compétences recherchées</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Ex: Vente, Gestion de stock..."
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1"
                  />
                  <Button type="button" size="sm" variant="outline" onClick={addSkill}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {skills.map((s) => (
                      <Badge key={s} variant="secondary" className="gap-1 text-xs">
                        {s}
                        <X className="w-3 h-3 cursor-pointer" onClick={() => removeSkill(s)} />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Adresse complète + Localisation */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Adresse complète</Label>
                <Input
                  placeholder="Ex: Rue 123, Quartier Commerce, Ville, Pays"
                  value={fullAddress}
                  onChange={(e) => setFullAddress(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Ville / Quartier</Label>
                  <Input
                    placeholder="Ville, Quartier..."
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Fourchette salariale</Label>
                  <Input
                    placeholder="Ex: 100 000 - 200 000 FCFA"
                    value={salaryRange}
                    onChange={(e) => setSalaryRange(e.target.value)}
                  />
                </div>
              </div>

              {/* Type contrat + Expérience */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Type de contrat</Label>
                  <Select value={contractType} onValueChange={setContractType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CONTRACT_TYPES.map(ct => (
                        <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Niveau d'expérience</Label>
                  <Select value={experienceLevel} onValueChange={setExperienceLevel}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {EXPERIENCE_LEVELS.map(el => (
                        <SelectItem key={el.value} value={el.value}>{el.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Documents requis - saisie libre */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-primary" />
                  Documents à fournir par le candidat
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Ex: CV, Diplôme, Permis..."
                    value={docInput}
                    onChange={(e) => setDocInput(e.target.value)}
                    onKeyDown={handleDocKeyDown}
                    className="flex-1"
                  />
                  <Button type="button" size="sm" variant="outline" onClick={addDocument}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {requiredDocuments.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {requiredDocuments.map((doc) => (
                      <Badge key={doc} variant="secondary" className="gap-1 text-xs">
                        {doc}
                        <X className="w-3 h-3 cursor-pointer" onClick={() => removeDocument(doc)} />
                      </Badge>
                    ))}
                  </div>
                )}
                {/* Suggestions rapides */}
                <div className="flex flex-wrap gap-1 mt-1">
                  {DOCUMENT_SUGGESTIONS.filter(s => !requiredDocuments.includes(s)).slice(0, 5).map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setRequiredDocuments(prev => [...prev, s])}
                      className="text-[10px] px-2 py-0.5 rounded-full border border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                    >
                      + {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Type de publication */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Type de publication *</Label>
                <p className="text-[10px] text-muted-foreground">Vous pouvez choisir les deux</p>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 cursor-pointer flex-1 border rounded-lg p-2.5 hover:bg-muted/30 transition-colors">
                    <Checkbox checked={publishAsPost} onCheckedChange={(v) => setPublishAsPost(!!v)} />
                    <span className="text-sm">📝 Post</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer flex-1 border rounded-lg p-2.5 hover:bg-muted/30 transition-colors">
                    <Checkbox checked={publishAsStatus} onCheckedChange={(v) => setPublishAsStatus(!!v)} />
                    <span className="text-sm">🔵 Statut</span>
                  </label>
                </div>
                {!publishAsPost && !publishAsStatus && (
                  <p className="text-[10px] text-destructive">Sélectionnez au moins un type</p>
                )}
              </div>

              {/* Upload de médias */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Photos / Vidéos</Label>
                <input
                  ref={mediaInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                  onChange={handleMediaSelect}
                />
                {mediaFiles.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {mediaFiles.map((media, idx) => (
                      <div key={idx} className="relative rounded-lg overflow-hidden border aspect-square bg-muted">
                        {media.type === 'image' ? (
                          <img src={media.url} alt={media.name} className="w-full h-full object-cover" />
                        ) : (
                          <video src={media.url} className="w-full h-full object-cover" muted />
                        )}
                        <button
                          type="button"
                          onClick={() => removeMedia(idx)}
                          className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 shadow"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  disabled={isUploadingMedia || mediaFiles.length >= 5}
                  onClick={() => mediaInputRef.current?.click()}
                >
                  {isUploadingMedia ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Upload en cours...</>
                  ) : (
                    <><ImagePlus className="w-4 h-4" /> Ajouter des médias ({mediaFiles.length}/5)</>
                  )}
                </Button>
              </div>

              {/* Budget & portée */}
              <div className="space-y-3 bg-muted/30 rounded-xl p-4 border">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Budget & Portée estimée
                </Label>
                <div className="space-y-2">
                  <Slider
                    value={[budget]}
                    onValueChange={([v]) => setBudget(v)}
                    min={500}
                    max={50000}
                    step={500}
                  />
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">500 FCFA</span>
                    <span className="font-bold text-primary">{formatBudget(budget)}</span>
                    <span className="text-muted-foreground">50 000 FCFA</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div className="bg-background rounded-lg p-3 text-center border">
                    <Users className="w-5 h-5 mx-auto mb-1 text-primary" />
                    <p className="text-lg font-bold">{reach.toLocaleString('fr-FR')}</p>
                    <p className="text-[10px] text-muted-foreground">Personnes atteintes</p>
                  </div>
                  <div className="bg-background rounded-lg p-3 text-center border">
                    <Calendar className="w-5 h-5 mx-auto mb-1 text-primary" />
                    <p className="text-lg font-bold">{duration}</p>
                    <p className="text-[10px] text-muted-foreground">Jours de diffusion</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => onOpenChange(false)}
                >
                  Annuler
                </Button>
                <Button
                  className="flex-1 gap-2"
                  disabled={!isValid}
                  onClick={() => setStep('preview')}
                >
                  <Eye className="w-4 h-4" />
                  Prévisualiser
                </Button>
              </div>
            </div>
          </>
        ) : (
          /* ============ PRÉVISUALISATION ============ */
          <div className="p-0">
            <div className="p-4 border-b flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setStep('form')}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <h3 className="font-semibold text-sm flex-1">Aperçu de l'annonce</h3>
              {publishAsPost && publishAsStatus && (
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant={previewMode === 'post' ? 'default' : 'outline'}
                    onClick={() => setPreviewMode('post')}
                    className="text-xs h-7 px-2"
                  >
                    📝 Post
                  </Button>
                  <Button
                    size="sm"
                    variant={previewMode === 'status' ? 'default' : 'outline'}
                    onClick={() => setPreviewMode('status')}
                    className="text-xs h-7 px-2"
                  >
                    🔵 Statut
                  </Button>
                </div>
              )}
            </div>

            {((publishAsPost && !publishAsStatus) || (publishAsPost && publishAsStatus && previewMode === 'post')) ? (
              <div className="p-4">
                <div className="border rounded-xl overflow-hidden bg-background shadow-sm">
                  <div className="p-4 flex items-center gap-3 border-b bg-muted/20">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Briefcase className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">Votre boutique</p>
                      <p className="text-[10px] text-muted-foreground">Sponsorisé · 📢 Recrutement</p>
                    </div>
                  </div>
                  {mediaFiles.length > 0 && (
                    <div className={`grid ${mediaFiles.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-0.5`}>
                      {mediaFiles.map((media, idx) => (
                        <div key={idx} className={`${mediaFiles.length === 1 ? 'aspect-video' : 'aspect-square'} overflow-hidden bg-muted`}>
                          {media.type === 'image' ? (
                            <img src={media.url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <video src={media.url} className="w-full h-full object-cover" muted controls />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="p-4 space-y-3">
                    <h4 className="font-bold text-base">{title}</h4>
                    {positions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {positions.map(p => (
                          <Badge key={p} variant="default" className="text-[10px]">🎯 {p}</Badge>
                        ))}
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{description}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {skills.map(s => (
                        <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-2">
                      {fullAddress && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {fullAddress}</span>}
                      {!fullAddress && location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {location}</span>}
                      <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" /> {contractType}</span>
                      {salaryRange && <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> {salaryRange}</span>}
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {EXPERIENCE_LEVELS.find(e => e.value === experienceLevel)?.label}</span>
                    </div>
                    {requiredDocuments.length > 0 && (
                      <div className="pt-2 border-t">
                        <p className="text-[10px] font-semibold text-muted-foreground mb-1">📎 Documents requis :</p>
                        <div className="flex flex-wrap gap-1">
                          {requiredDocuments.map(d => (
                            <Badge key={d} variant="outline" className="text-[9px]">
                              {AVAILABLE_DOCUMENTS.find(ad => ad.value === d)?.label || d}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-3 border-t bg-muted/10 flex items-center justify-between text-xs text-muted-foreground">
                    <span>~{reach.toLocaleString('fr-FR')} personnes atteintes</span>
                    <span>{duration} jours</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 flex justify-center">
                <div className="w-64 h-96 rounded-2xl overflow-hidden relative shadow-lg flex flex-col justify-end">
                  {mediaFiles.length > 0 && mediaFiles[0].type === 'image' ? (
                    <img src={mediaFiles[0].url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  ) : mediaFiles.length > 0 && mediaFiles[0].type === 'video' ? (
                    <video src={mediaFiles[0].url} className="absolute inset-0 w-full h-full object-cover" muted autoPlay loop />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/80 to-primary" />
                  )}
                  <div className="absolute inset-0 bg-black/20" />
                  <div className="absolute inset-0 flex items-center justify-center p-6">
                    <div className="text-center text-white">
                      <Megaphone className="w-10 h-10 mx-auto mb-3 opacity-80" />
                      <h4 className="text-lg font-bold leading-tight drop-shadow">{title}</h4>
                      {positions.length > 0 && (
                        <p className="text-xs mt-1 opacity-90">🎯 {positions.join(', ')}</p>
                      )}
                      {location && (
                        <p className="text-xs mt-2 opacity-80 flex items-center justify-center gap-1">
                          <MapPin className="w-3 h-3" /> {location}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="relative z-10 p-4 bg-black/30 backdrop-blur-sm">
                    <p className="text-white text-xs leading-relaxed line-clamp-3">{description}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {skills.slice(0, 3).map(s => (
                        <Badge key={s} className="bg-white/20 text-white border-white/30 text-[9px]">{s}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Résumé budget */}
            <div className="p-4 border-t bg-muted/10">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-muted-foreground">Budget</span>
                <span className="font-bold text-primary">{formatBudget(budget)}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                <span>Publication : {[publishAsPost && '📝 Post', publishAsStatus && '🔵 Statut'].filter(Boolean).join(' + ')}</span>
                <span>{mediaFiles.length} média(s)</span>
              </div>
              <Button
                className="w-full gap-2"
                onClick={handleSubmit}
                disabled={createAd.isPending}
              >
                <Send className="w-4 h-4" />
                {createAd.isPending ? 'Soumission...' : "Soumettre l'annonce"}
              </Button>
              <p className="text-[10px] text-center text-muted-foreground mt-2">
                Votre annonce sera examinée par un administrateur avant publication
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RecruitmentAdForm;
