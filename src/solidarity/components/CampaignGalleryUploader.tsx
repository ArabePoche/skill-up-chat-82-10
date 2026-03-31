/**
 * Composant d'upload multi-médias pour la galerie d'une cagnotte solidaire.
 * Upload vers le bucket Supabase 'solidarity-images'.
 * Peut fonctionner en mode "pending" (avant création) ou "live" (cagnotte déjà créée).
 */
import React, { useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { compressImage } from '@/utils/imageCompression';
import { toast } from 'sonner';
import { useAddCampaignMedia } from '../hooks/useSolidarityCampaigns';

export interface GalleryItem {
  url: string;
  type: 'image' | 'video';
}

interface CampaignGalleryUploaderProps {
  /** Mode "pending": liste locale (avant création de la cagnotte) */
  items?: GalleryItem[];
  onItemsChange?: (items: GalleryItem[]) => void;
  /** Mode "live": ID de la cagnotte existante */
  campaignId?: string;
  /** Nombre de médias déjà présents dans la galerie (pour le calcul des positions en mode live) */
  existingCount?: number;
  /** Nombre max de médias dans la galerie */
  maxItems?: number;
}

const isVideoUrl = (url: string) =>
  /\.(mp4|webm|ogg|mov|avi)(\?|$)/i.test(url);

const CampaignGalleryUploader: React.FC<CampaignGalleryUploaderProps> = ({
  items = [],
  onItemsChange,
  campaignId,
  existingCount = 0,
  maxItems = 10,
}) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { mutateAsync: addMedia } = useAddCampaignMedia();

  const isLiveMode = !!campaignId;

  const uploadFile = async (file: File): Promise<GalleryItem | null> => {
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');

    if (!isImage && !isVideo) {
      toast.error(`Type de fichier non supporté: ${file.name}`);
      return null;
    }

    try {
      let blob: Blob = file;
      if (isImage) {
        blob = await compressImage(file, {
          maxSizeMB: 2,
          maxWidthOrHeight: 1200,
          quality: 0.85,
        });
      }

      const ext = file.name.split('.').pop();
      const fileName = `${user!.id}/gallery/${Date.now()}-${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('solidarity-images')
        .upload(fileName, blob, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('solidarity-images')
        .getPublicUrl(fileName);

      return { url: publicUrl, type: isVideo ? 'video' : 'image' };
    } catch (err: any) {
      console.error('Erreur upload média galerie:', err);
      toast.error(err.message || `Erreur lors de l'upload de ${file.name}`);
      return null;
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !user?.id) return;

    const remaining = maxItems - (isLiveMode ? 0 : items.length);
    const toUpload = files.slice(0, remaining);

    setUploading(true);
    try {
      const results = await Promise.all(toUpload.map(uploadFile));
      const uploaded = results.filter((r): r is GalleryItem => r !== null);

      if (uploaded.length === 0) return;

      if (isLiveMode && campaignId) {
        await Promise.all(
          uploaded.map((item, idx) =>
            addMedia({
              campaignId,
              mediaUrl: item.url,
              mediaType: item.type,
              position: existingCount + idx,
            })
          )
        );
        toast.success(`${uploaded.length} média(s) ajouté(s) à la galerie`);
      } else {
        const newItems = [...items, ...uploaded];
        onItemsChange?.(newItems);
        if (uploaded.length > 0) {
          toast.success(`${uploaded.length} média(s) prêt(s)`);
        }
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    onItemsChange?.(newItems);
  };

  const canAddMore = isLiveMode || items.length < maxItems;

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Grille des médias déjà uploadés (mode pending seulement) */}
      {!isLiveMode && items.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="relative aspect-square rounded-lg overflow-hidden border border-border bg-muted"
            >
              {item.type === 'video' ? (
                <video
                  src={item.url}
                  className="w-full h-full object-cover"
                  muted
                  preload="metadata"
                />
              ) : (
                <img
                  src={item.url}
                  alt={`Média galerie ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              )}
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                className="absolute top-1 right-1 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
              >
                <X size={12} />
              </button>
            </div>
          ))}

          {canAddMore && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors text-xs"
            >
              {uploading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <ImagePlus size={18} />
                  <span>Ajouter</span>
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Bouton principal quand pas encore de médias ou mode live */}
      {((!isLiveMode && items.length === 0) || isLiveMode) && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full rounded-xl border-2 border-dashed border-muted-foreground/30 py-4 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
        >
          {uploading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Upload en cours...</span>
            </>
          ) : (
            <>
              <ImagePlus size={18} />
              <span>Ajouter des photos / vidéos à la galerie</span>
            </>
          )}
        </button>
      )}
    </div>
  );
};

export { isVideoUrl };
export default CampaignGalleryUploader;
