/**
 * Formulaire de création d'annonce de recrutement avec prévisualisation
 * Inclut : titre, description, compétences, localisation, salaire, contrat, expérience, médias
 * Prévisualisation en mode Post ou Statut avant publication
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

const RecruitmentAdForm: React.FC<RecruitmentAdFormProps> = ({ open, onOpenChange, shopId }) => {
  const { user } = useAuth();
  const createAd = useCreateRecruitmentAd();

  // Step: 'form' | 'preview'
  const [step, setStep] = useState<'form' | 'preview'>('form');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [location, setLocation] = useState('');
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

  const reach = useMemo(() => estimateReach(budget), [budget]);
  const duration = useMemo(() => estimateDuration(budget), [budget]);

  /** Upload de médias (photos/vidéos) vers Supabase Storage */
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

        // Compresser les images, garder les vidéos telles quelles
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSkill();
    }
  };

  const isValid = title.trim().length >= 3 && description.trim().length >= 10 && budget >= 500 && (publishAsPost || publishAsStatus);

  const handleSubmit = async () => {
    if (!user?.id || !isValid) return;
    const publishType = publishAsPost && publishAsStatus ? 'post' : publishAsPost ? 'post' : 'status';
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
      budget,
    });
    // Reset
    setTitle('');
    setDescription('');
    setSkills([]);
    setLocation('');
    setSalaryRange('');
    setBudget(1000);
    setMediaFiles([]);
    setPublishAsPost(true);
    setPublishAsStatus(false);
    setStep('form');
    onOpenChange(false);
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

              {/* Localisation + Salaire */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Localisation</Label>
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

              {/* Type de publication */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Type de publication</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={publishType === 'post' ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1"
                    onClick={() => setPublishType('post')}
                  >
                    📝 Post
                  </Button>
                  <Button
                    type="button"
                    variant={publishType === 'status' ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1"
                    onClick={() => setPublishType('status')}
                  >
                    🔵 Statut
                  </Button>
                </div>
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
              <h3 className="font-semibold text-sm">
                Aperçu — {publishType === 'post' ? '📝 Post' : '🔵 Statut'}
              </h3>
            </div>

            {publishType === 'post' ? (
              /* Prévisualisation Post */
              <div className="p-4">
                <div className="border rounded-xl overflow-hidden bg-background shadow-sm">
                  {/* Header du post */}
                  <div className="p-4 flex items-center gap-3 border-b bg-muted/20">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Briefcase className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">Votre boutique</p>
                      <p className="text-[10px] text-muted-foreground">Sponsorisé · 📢 Recrutement</p>
                    </div>
                  </div>
                  {/* Corps */}
                  <div className="p-4 space-y-3">
                    <h4 className="font-bold text-base">{title}</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                      {description}
                    </p>

                    <div className="flex flex-wrap gap-1.5">
                      {skills.map(s => (
                        <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-2">
                      {location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {location}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Briefcase className="w-3 h-3" /> {contractType}
                      </span>
                      {salaryRange && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" /> {salaryRange}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {EXPERIENCE_LEVELS.find(e => e.value === experienceLevel)?.label}
                      </span>
                    </div>
                  </div>
                  {/* Footer */}
                  <div className="p-3 border-t bg-muted/10 flex items-center justify-between text-xs text-muted-foreground">
                    <span>~{reach.toLocaleString('fr-FR')} personnes atteintes</span>
                    <span>{duration} jours</span>
                  </div>
                </div>
              </div>
            ) : (
              /* Prévisualisation Statut */
              <div className="p-4 flex justify-center">
                <div className="w-64 h-96 rounded-2xl bg-gradient-to-br from-primary/80 to-primary overflow-hidden relative shadow-lg flex flex-col justify-end">
                  <div className="absolute inset-0 flex items-center justify-center p-6">
                    <div className="text-center text-primary-foreground">
                      <Megaphone className="w-10 h-10 mx-auto mb-3 opacity-80" />
                      <h4 className="text-lg font-bold leading-tight">{title}</h4>
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
              <div className="flex items-center justify-between text-sm mb-3">
                <span className="text-muted-foreground">Budget</span>
                <span className="font-bold text-primary">{formatBudget(budget)}</span>
              </div>
              <Button
                className="w-full gap-2"
                onClick={handleSubmit}
                disabled={createAd.isPending}
              >
                <Send className="w-4 h-4" />
                {createAd.isPending ? 'Publication...' : 'Publier l\'annonce'}
              </Button>
              <p className="text-[10px] text-center text-muted-foreground mt-2">
                Le paiement mobile money / carte sera demandé pour activer la diffusion
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RecruitmentAdForm;
