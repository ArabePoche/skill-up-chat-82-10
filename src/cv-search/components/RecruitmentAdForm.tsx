/**
 * Formulaire de création d'annonce (recrutement OU produit/service)
 * Étape 1: choix du type → Étape 2: formulaire dédié → Étape 3: prévisualisation
 */
import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  ShoppingBag,
  Package,
  Link as LinkIcon,
} from 'lucide-react';
import { estimateReach, estimateDuration, useCreateRecruitmentAd } from '../hooks/useRecruitmentAds';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { compressImage } from '@/utils/imageCompression';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';

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

const DOCUMENT_SUGGESTIONS = ['CV', 'Lettre de motivation', 'Diplôme(s)', 'Photo d\'identité', 'Carte d\'identité', 'Certificat de travail', 'Casier judiciaire', 'Permis de conduire', 'Références professionnelles'];

type AdType = 'recruitment' | 'product';

const RecruitmentAdForm: React.FC<RecruitmentAdFormProps> = ({ open, onOpenChange, shopId }) => {
  const { user } = useAuth();
  const createAd = useCreateRecruitmentAd();

  const [step, setStep] = useState<'type' | 'form' | 'preview'>('type');
  const [adType, setAdType] = useState<AdType>('recruitment');

  // Champs communs
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [fullAddress, setFullAddress] = useState('');
  const [publishAsPost, setPublishAsPost] = useState(true);
  const [publishAsStatus, setPublishAsStatus] = useState(false);
  const [previewMode, setPreviewMode] = useState<'post' | 'status'>('post');
  const [budget, setBudget] = useState(1000);
  const [mediaFiles, setMediaFiles] = useState<{ url: string; type: 'image' | 'video'; name: string }[]>([]);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const mediaInputRef = useRef<HTMLInputElement>(null);

  // Champs recrutement
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [salaryRange, setSalaryRange] = useState('');
  const [contractType, setContractType] = useState('CDI');
  const [experienceLevel, setExperienceLevel] = useState('junior');
  const [positions, setPositions] = useState<string[]>([]);
  const [positionInput, setPositionInput] = useState('');
  const [requiredDocuments, setRequiredDocuments] = useState<string[]>([]);
  const [docInput, setDocInput] = useState('');

  // Champs produit/service
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');

  // Charger les produits de la boutique de l'utilisateur
  const { data: userShops } = useQuery({
    queryKey: ['user-shops', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('physical_shops')
        .select('id, name')
        .eq('owner_id', user!.id);
      return data || [];
    },
    enabled: !!user?.id && adType === 'product',
  });

  const activeShopId = shopId || userShops?.[0]?.id;

  const { data: shopProducts } = useQuery({
    queryKey: ['shop-products-for-ad', activeShopId],
    queryFn: async () => {
      const { data } = await (supabase
        .from('physical_shop_products' as any)
        .select('id, name, price, image_url')
        .eq('shop_id', activeShopId!)
        .order('name') as any);
      return (data || []) as Array<{ id: string; name: string; price: number; image_url: string | null }>;
    },
    enabled: !!activeShopId && adType === 'product',
  });

  // Auto-fill quand un produit est sélectionné
  useEffect(() => {
    if (selectedProductId && shopProducts) {
      const product = shopProducts.find(p => p.id === selectedProductId);
      if (product) {
        setProductName(product.name);
        setProductPrice(product.price?.toString() || '');
        if (!title) setTitle(product.name);
      }
    }
  }, [selectedProductId, shopProducts]);

  const reach = useMemo(() => estimateReach(budget), [budget]);
  const duration = useMemo(() => estimateDuration(budget), [budget]);

  // === Handlers médias ===
  const handleMediaSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user?.id) return;
    setIsUploadingMedia(true);
    try {
      for (const file of Array.from(files)) {
        if (mediaFiles.length >= 5) { toast.error('Maximum 5 médias'); break; }
        const isVideo = file.type.startsWith('video/');
        const isImage = file.type.startsWith('image/');
        if (!isVideo && !isImage) { toast.error(`${file.name}: type non supporté`); continue; }
        let uploadFile: File | Blob = file;
        if (isImage) uploadFile = await compressImage(file, { maxSizeMB: 2, maxWidthOrHeight: 1200, quality: 0.8 });
        const ext = file.name.split('.').pop();
        const path = `recruitment-ads/${user.id}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('product-images').upload(path, uploadFile, { cacheControl: '3600', upsert: false });
        if (uploadError) { toast.error(`Erreur upload: ${uploadError.message}`); continue; }
        const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(path);
        setMediaFiles(prev => [...prev, { url: publicUrl, type: isVideo ? 'video' : 'image', name: file.name }]);
      }
      toast.success('Média(s) ajouté(s) !');
    } catch (err: any) { toast.error(err.message || 'Erreur upload'); }
    finally { setIsUploadingMedia(false); if (mediaInputRef.current) mediaInputRef.current.value = ''; }
  };

  const removeMedia = (index: number) => setMediaFiles(prev => prev.filter((_, i) => i !== index));

  // === Handlers tags ===
  const addTag = (value: string, list: string[], setList: (v: string[]) => void, setInput: (v: string) => void) => {
    const trimmed = value.trim();
    if (trimmed && !list.includes(trimmed)) { setList([...list, trimmed]); setInput(''); }
  };
  const removeTag = (tag: string, list: string[], setList: (v: string[]) => void) => setList(list.filter(t => t !== tag));

  const isValid = adType === 'recruitment'
    ? title.trim().length >= 3 && description.trim().length >= 10 && budget >= 500 && (publishAsPost || publishAsStatus) && positions.length > 0
    : title.trim().length >= 3 && description.trim().length >= 10 && budget >= 500 && (publishAsPost || publishAsStatus);

  const handleSubmit = async () => {
    if (!user?.id || !isValid) { toast.error('Veuillez remplir tous les champs obligatoires'); return; }
    const publishType = publishAsPost && publishAsStatus ? 'post' : publishAsPost ? 'post' : 'status';
    try {
      await createAd.mutateAsync({
        owner_id: user.id,
        shop_id: activeShopId,
        ad_type: adType,
        title: title.trim(),
        description: description.trim(),
        skills: adType === 'recruitment' ? skills : [],
        location: location.trim(),
        salary_range: adType === 'recruitment' ? salaryRange.trim() : '',
        contract_type: adType === 'recruitment' ? contractType : '',
        experience_level: adType === 'recruitment' ? experienceLevel : '',
        media_urls: mediaFiles.map(m => m.url),
        publish_type: publishType,
        publish_as_post: publishAsPost,
        publish_as_status: publishAsStatus,
        budget,
        positions: adType === 'recruitment' ? positions : [],
        required_documents: adType === 'recruitment' ? requiredDocuments : [],
        full_address: fullAddress.trim(),
        product_id: adType === 'product' ? selectedProductId || undefined : undefined,
        product_name: adType === 'product' ? productName.trim() : undefined,
        product_price: adType === 'product' ? parseFloat(productPrice) || undefined : undefined,
        service_description: adType === 'product' ? serviceDescription.trim() : undefined,
      });
      // Reset
      setTitle(''); setDescription(''); setSkills([]); setLocation(''); setFullAddress('');
      setSalaryRange(''); setBudget(1000); setMediaFiles([]); setPublishAsPost(true);
      setPublishAsStatus(false); setPositions([]); setRequiredDocuments([]);
      setSelectedProductId(''); setProductName(''); setProductPrice(''); setServiceDescription('');
      setStep('type');
      onOpenChange(false);
    } catch (err: any) { console.error('❌ Erreur soumission annonce:', err); }
  };

  const formatBudget = (v: number) => `${v.toLocaleString('fr-FR')} FCFA`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0">
        {/* === ÉTAPE 1: CHOIX DU TYPE === */}
        {step === 'type' && (
          <>
            <DialogHeader className="p-5 pb-0">
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Megaphone className="w-5 h-5 text-primary" />
                Lancer une annonce
              </DialogTitle>
              <DialogDescription className="text-xs">
                Choisissez le type d'annonce que vous souhaitez publier
              </DialogDescription>
            </DialogHeader>
            <div className="p-5 space-y-3">
              <button
                onClick={() => { setAdType('recruitment'); setStep('form'); }}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 hover:border-primary hover:bg-primary/5 transition-all text-left group"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                  <Briefcase className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm group-hover:text-primary transition-colors">Recrutement</p>
                  <p className="text-xs text-muted-foreground">Publiez une offre d'emploi avec compétences, contrat, salaire...</p>
                </div>
              </button>
              <button
                onClick={() => { setAdType('product'); setStep('form'); }}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 hover:border-primary hover:bg-primary/5 transition-all text-left group"
              >
                <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                  <ShoppingBag className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm group-hover:text-primary transition-colors">Produit / Service</p>
                  <p className="text-xs text-muted-foreground">Faites la promotion d'un produit ou service de votre boutique</p>
                </div>
              </button>
            </div>
          </>
        )}

        {/* === ÉTAPE 2: FORMULAIRE === */}
        {step === 'form' && (
          <>
            <DialogHeader className="p-5 pb-0">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setStep('type')}>
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <DialogTitle className="flex items-center gap-2 text-lg">
                  {adType === 'recruitment' ? <Briefcase className="w-5 h-5 text-primary" /> : <ShoppingBag className="w-5 h-5 text-green-500" />}
                  {adType === 'recruitment' ? 'Annonce de recrutement' : 'Annonce produit / service'}
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs">
                La portée dépend de votre budget. Publication en Post et/ou Statut.
              </DialogDescription>
            </DialogHeader>

            <div className="p-5 space-y-4">
              {/* Titre */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Titre de l'annonce *</Label>
                <Input
                  placeholder={adType === 'recruitment' ? "Ex: Vendeur expérimenté pour boutique" : "Ex: Promo sur nos sacs en cuir"}
                  value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100}
                />
              </div>

              {/* === CHAMPS RECRUTEMENT === */}
              {adType === 'recruitment' && (
                <>
                  {/* Postes recherchés */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Poste(s) recherché(s) *</Label>
                    <div className="flex gap-2">
                      <Input placeholder="Ex: Caissier, Vendeur..." value={positionInput}
                        onChange={(e) => setPositionInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(positionInput, positions, setPositions, setPositionInput); } }}
                        className="flex-1" />
                      <Button type="button" size="sm" variant="outline" onClick={() => addTag(positionInput, positions, setPositions, setPositionInput)}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    {positions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {positions.map(p => <Badge key={p} variant="default" className="gap-1 text-xs">{p}<X className="w-3 h-3 cursor-pointer" onClick={() => removeTag(p, positions, setPositions)} /></Badge>)}
                      </div>
                    )}
                    {positions.length === 0 && <p className="text-[10px] text-destructive">Ajoutez au moins un poste</p>}
                  </div>

                  {/* Compétences */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Compétences recherchées</Label>
                    <div className="flex gap-2">
                      <Input placeholder="Ex: Vente, Gestion de stock..." value={skillInput}
                        onChange={(e) => setSkillInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(skillInput, skills, setSkills, setSkillInput); } }}
                        className="flex-1" />
                      <Button type="button" size="sm" variant="outline" onClick={() => addTag(skillInput, skills, setSkills, setSkillInput)}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    {skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {skills.map(s => <Badge key={s} variant="secondary" className="gap-1 text-xs">{s}<X className="w-3 h-3 cursor-pointer" onClick={() => removeTag(s, skills, setSkills)} /></Badge>)}
                      </div>
                    )}
                  </div>

                  {/* Contrat + Expérience */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Type de contrat</Label>
                      <Select value={contractType} onValueChange={setContractType}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CONTRACT_TYPES.map(ct => <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Niveau d'expérience</Label>
                      <Select value={experienceLevel} onValueChange={setExperienceLevel}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {EXPERIENCE_LEVELS.map(el => <SelectItem key={el.value} value={el.value}>{el.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Salaire */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Fourchette salariale</Label>
                    <Input placeholder="Ex: 100 000 - 200 000 FCFA" value={salaryRange} onChange={(e) => setSalaryRange(e.target.value)} />
                  </div>

                  {/* Documents requis */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-primary" />
                      Documents à fournir
                    </Label>
                    <div className="flex gap-2">
                      <Input placeholder="Ex: CV, Diplôme, Permis..." value={docInput}
                        onChange={(e) => setDocInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(docInput, requiredDocuments, setRequiredDocuments, setDocInput); } }}
                        className="flex-1" />
                      <Button type="button" size="sm" variant="outline" onClick={() => addTag(docInput, requiredDocuments, setRequiredDocuments, setDocInput)}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    {requiredDocuments.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {requiredDocuments.map(doc => <Badge key={doc} variant="secondary" className="gap-1 text-xs">{doc}<X className="w-3 h-3 cursor-pointer" onClick={() => removeTag(doc, requiredDocuments, setRequiredDocuments)} /></Badge>)}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {DOCUMENT_SUGGESTIONS.filter(s => !requiredDocuments.includes(s)).slice(0, 5).map(s => (
                        <button key={s} type="button" onClick={() => setRequiredDocuments(prev => [...prev, s])}
                          className="text-[10px] px-2 py-0.5 rounded-full border border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                          + {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* === CHAMPS PRODUIT/SERVICE === */}
              {adType === 'product' && (
                <>
                  {/* Sélection produit de la boutique */}
                  {shopProducts && shopProducts.length > 0 && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold flex items-center gap-1.5">
                        <Package className="w-4 h-4 text-green-500" />
                        Lier à un produit de votre boutique (optionnel)
                      </Label>
                      <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                        <SelectTrigger><SelectValue placeholder="Choisir un produit..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Aucun (annonce libre)</SelectItem>
                          {shopProducts.map(p => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name} — {p.price?.toLocaleString('fr-FR')} FCFA
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedProductId && selectedProductId !== 'none' && (
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <LinkIcon className="w-3 h-3" /> Un lien vers la marketplace sera ajouté automatiquement
                        </p>
                      )}
                    </div>
                  )}

                  {/* Nom du produit / service */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Nom du produit / service</Label>
                    <Input placeholder="Ex: Sac en cuir artisanal" value={productName} onChange={(e) => setProductName(e.target.value)} />
                  </div>

                  {/* Prix */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Prix (FCFA)</Label>
                    <Input type="number" placeholder="Ex: 15000" value={productPrice} onChange={(e) => setProductPrice(e.target.value)} />
                  </div>

                  {/* Description du service */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Détails du produit / service</Label>
                    <Textarea placeholder="Caractéristiques, avantages, conditions de livraison..." value={serviceDescription}
                      onChange={(e) => setServiceDescription(e.target.value)} rows={3} maxLength={1000} />
                  </div>
                </>
              )}

              {/* === CHAMPS COMMUNS === */}
              {/* Description */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Description générale *</Label>
                <Textarea placeholder={adType === 'recruitment' ? "Décrivez le poste, les responsabilités..." : "Décrivez votre offre, promotions..."}
                  value={description} onChange={(e) => setDescription(e.target.value)} rows={4} maxLength={2000} />
                <p className="text-[10px] text-muted-foreground text-right">{description.length}/2000</p>
              </div>

              {/* Adresse + Localisation */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Adresse complète</Label>
                <Input placeholder="Ex: Rue 123, Quartier Commerce, Ville, Pays" value={fullAddress} onChange={(e) => setFullAddress(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Ville / Quartier</Label>
                <Input placeholder="Ville, Quartier..." value={location} onChange={(e) => setLocation(e.target.value)} />
              </div>

              {/* Type de publication */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Type de publication *</Label>
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
                {!publishAsPost && !publishAsStatus && <p className="text-[10px] text-destructive">Sélectionnez au moins un type</p>}
              </div>

              {/* Médias */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Photos / Vidéos</Label>
                <input ref={mediaInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleMediaSelect} />
                {mediaFiles.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {mediaFiles.map((media, idx) => (
                      <div key={idx} className="relative rounded-lg overflow-hidden border aspect-square bg-muted">
                        {media.type === 'image' ? <img src={media.url} alt={media.name} className="w-full h-full object-cover" /> : <video src={media.url} className="w-full h-full object-cover" muted />}
                        <button type="button" onClick={() => removeMedia(idx)} className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 shadow"><X size={12} /></button>
                      </div>
                    ))}
                  </div>
                )}
                <Button type="button" variant="outline" size="sm" className="w-full gap-2" disabled={isUploadingMedia || mediaFiles.length >= 5} onClick={() => mediaInputRef.current?.click()}>
                  {isUploadingMedia ? <><Loader2 className="w-4 h-4 animate-spin" /> Upload...</> : <><ImagePlus className="w-4 h-4" /> Ajouter des médias ({mediaFiles.length}/5)</>}
                </Button>
              </div>

              {/* Budget & portée */}
              <div className="space-y-3 bg-muted/30 rounded-xl p-4 border">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Budget & Portée estimée
                </Label>
                <div className="space-y-2">
                  <Slider value={[budget]} onValueChange={([v]) => setBudget(v)} min={500} max={50000} step={500} />
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
                <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Annuler</Button>
                <Button className="flex-1 gap-2" disabled={!isValid} onClick={() => setStep('preview')}>
                  <Eye className="w-4 h-4" /> Prévisualiser
                </Button>
              </div>
            </div>
          </>
        )}

        {/* === ÉTAPE 3: PRÉVISUALISATION === */}
        {step === 'preview' && (
          <div className="p-0">
            <div className="p-4 border-b flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setStep('form')}><ArrowLeft className="w-4 h-4" /></Button>
              <h3 className="font-semibold text-sm flex-1">Aperçu de l'annonce</h3>
              <Badge variant={adType === 'recruitment' ? 'default' : 'secondary'} className="text-[10px]">
                {adType === 'recruitment' ? '💼 Recrutement' : '🛍️ Produit'}
              </Badge>
              {publishAsPost && publishAsStatus && (
                <div className="flex gap-1">
                  <Button size="sm" variant={previewMode === 'post' ? 'default' : 'outline'} onClick={() => setPreviewMode('post')} className="text-xs h-7 px-2">📝 Post</Button>
                  <Button size="sm" variant={previewMode === 'status' ? 'default' : 'outline'} onClick={() => setPreviewMode('status')} className="text-xs h-7 px-2">🔵 Statut</Button>
                </div>
              )}
            </div>

            {((publishAsPost && !publishAsStatus) || (publishAsPost && publishAsStatus && previewMode === 'post')) ? (
              <div className="p-4">
                <div className="border rounded-xl overflow-hidden bg-background shadow-sm">
                  <div className="p-4 flex items-center gap-3 border-b bg-muted/20">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      {adType === 'recruitment' ? <Briefcase className="w-5 h-5 text-primary" /> : <ShoppingBag className="w-5 h-5 text-green-500" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{adType === 'recruitment' ? 'Votre entreprise' : 'Votre boutique'}</p>
                      <p className="text-[10px] text-muted-foreground">Sponsorisé · {adType === 'recruitment' ? '📢 Recrutement' : '🛍️ Produit'}</p>
                    </div>
                  </div>
                  {mediaFiles.length > 0 && (
                    <div className={`grid ${mediaFiles.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-0.5`}>
                      {mediaFiles.map((media, idx) => (
                        <div key={idx} className={`${mediaFiles.length === 1 ? 'aspect-video' : 'aspect-square'} overflow-hidden bg-muted`}>
                          {media.type === 'image' ? <img src={media.url} alt="" className="w-full h-full object-cover" /> : <video src={media.url} className="w-full h-full object-cover" muted controls />}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="p-4 space-y-3">
                    <h4 className="font-bold text-base">{title}</h4>
                    {adType === 'recruitment' && positions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {positions.map(p => <Badge key={p} variant="default" className="text-[10px]">🎯 {p}</Badge>)}
                      </div>
                    )}
                    {adType === 'product' && productPrice && (
                      <p className="text-lg font-bold text-primary">{parseFloat(productPrice).toLocaleString('fr-FR')} FCFA</p>
                    )}
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{description}</p>
                    {adType === 'product' && serviceDescription && (
                      <p className="text-xs text-muted-foreground italic">{serviceDescription}</p>
                    )}
                    {adType === 'recruitment' && skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {skills.map(s => <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>)}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-2">
                      {fullAddress && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {fullAddress}</span>}
                      {!fullAddress && location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {location}</span>}
                      {adType === 'recruitment' && <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" /> {contractType}</span>}
                      {adType === 'recruitment' && salaryRange && <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> {salaryRange}</span>}
                      {adType === 'recruitment' && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {EXPERIENCE_LEVELS.find(e => e.value === experienceLevel)?.label}</span>}
                    </div>
                    {adType === 'recruitment' && requiredDocuments.length > 0 && (
                      <div className="pt-2 border-t">
                        <p className="text-[10px] font-semibold text-muted-foreground mb-1">📎 Documents requis :</p>
                        <div className="flex flex-wrap gap-1">
                          {requiredDocuments.map(d => <Badge key={d} variant="outline" className="text-[9px]">{d}</Badge>)}
                        </div>
                      </div>
                    )}
                    {adType === 'product' && selectedProductId && selectedProductId !== 'none' && (
                      <div className="pt-2 border-t">
                        <Badge variant="outline" className="text-[10px] gap-1">
                          <LinkIcon className="w-3 h-3" /> Lien vers la marketplace
                        </Badge>
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
              /* Prévisualisation Statut */
              <div className="p-4 flex justify-center">
                <div className="w-64 h-96 rounded-2xl overflow-hidden relative shadow-lg flex flex-col justify-end">
                  {mediaFiles.length > 0 && mediaFiles[0].type === 'image' ? (
                    <img src={mediaFiles[0].url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  ) : mediaFiles.length > 0 && mediaFiles[0].type === 'video' ? (
                    <video src={mediaFiles[0].url} className="absolute inset-0 w-full h-full object-cover" muted autoPlay loop />
                  ) : (
                    <div className={`absolute inset-0 ${adType === 'product' ? 'bg-gradient-to-br from-green-600/80 to-green-800' : 'bg-gradient-to-br from-primary/80 to-primary'}`} />
                  )}
                  <div className="absolute inset-0 bg-black/20" />
                  <div className="absolute inset-0 flex items-center justify-center p-6">
                    <div className="text-center text-white">
                      {adType === 'recruitment' ? <Megaphone className="w-10 h-10 mx-auto mb-3 opacity-80" /> : <ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-80" />}
                      <h4 className="text-lg font-bold leading-tight drop-shadow">{title}</h4>
                      {adType === 'recruitment' && positions.length > 0 && <p className="text-xs mt-1 opacity-90">🎯 {positions.join(', ')}</p>}
                      {adType === 'product' && productPrice && <p className="text-sm mt-1 font-bold">{parseFloat(productPrice).toLocaleString('fr-FR')} FCFA</p>}
                      {location && <p className="text-xs mt-2 opacity-80 flex items-center justify-center gap-1"><MapPin className="w-3 h-3" /> {location}</p>}
                    </div>
                  </div>
                  <div className="relative z-10 p-4 bg-black/30 backdrop-blur-sm">
                    <p className="text-white text-xs leading-relaxed line-clamp-3">{description}</p>
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
              <Button className="w-full gap-2" onClick={handleSubmit} disabled={createAd.isPending}>
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
