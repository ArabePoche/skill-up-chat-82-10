/**
 * Formulaire d'édition des métadonnées d'une vidéo (titre, description, miniature, type, formation).
 * Permet de capturer une miniature directement depuis la vidéo en mettant en pause.
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useFormations } from '@/hooks/useFormations';
import { Upload, Camera } from 'lucide-react';

interface Video {
  id: string;
  title: string;
  description: string;
  video_url: string;
  thumbnail_url: string;
  likes_count: number;
  comments_count: number;
  author_id: string;
  video_type?: string;
  formation_id?: string;
  profiles?: {
    first_name?: string;
    last_name?: string;
    username?: string;
    avatar_url?: string;
  };
}

interface VideoEditFormProps {
  video: Video;
  onSuccess: () => void;
  onCancel: () => void;
}

const extractYouTubeVideoId = (url: string): string => {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.replace(/^www\./, '');

    if (hostname === 'youtu.be') {
      return parsedUrl.pathname.split('/').filter(Boolean)[0] ?? '';
    }

    if (hostname === 'youtube.com' || hostname === 'm.youtube.com' || hostname === 'youtube-nocookie.com') {
      if (parsedUrl.pathname === '/watch') {
        return parsedUrl.searchParams.get('v') ?? '';
      }

      const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);
      if (pathSegments[0] === 'embed' || pathSegments[0] === 'shorts') {
        return pathSegments[1] ?? '';
      }
    }
  } catch {
    return '';
  }

  return '';
};

const extractVimeoVideoId = (url: string): string => {
  try {
    const parsedUrl = new URL(url);
    const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);
    for (let index = pathSegments.length - 1; index >= 0; index -= 1) {
      if (/^\d+$/.test(pathSegments[index])) {
        return pathSegments[index];
      }
    }
  } catch {
    return url.match(/vimeo\.com\/(?:video\/)?(\d+)/)?.[1] ?? '';
  }

  return '';
};

const VideoEditForm: React.FC<VideoEditFormProps> = ({ video, onSuccess, onCancel }) => {
  const { uploadFile, isUploading } = useFileUpload();
  const { data: formations = [] } = useFormations();
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [formData, setFormData] = useState({
    title: video.title || '',
    description: video.description || '',
    video_url: video.video_url || '',
    thumbnail_url: video.thumbnail_url || '',
    video_type: (video.video_type as 'lesson' | 'promo' | 'classic') || 'classic',
    formation_id: video.formation_id || '',
  });
  
  const [selectedThumbnailFile, setSelectedThumbnailFile] = useState<File | null>(null);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [isPortraitVideo, setIsPortraitVideo] = useState<boolean | null>(null);

  const isYouTubeVideo = /(youtube\.com|youtu\.be|youtube-nocookie\.com)/i.test(formData.video_url);
  const isVimeoVideo = /vimeo\.com/i.test(formData.video_url);
  const isNativeVideo = !!formData.video_url && !isYouTubeVideo && !isVimeoVideo;
  const canCaptureFrame = isNativeVideo;
  const youtubeVideoId = isYouTubeVideo ? extractYouTubeVideoId(formData.video_url) : '';
  const vimeoVideoId = isVimeoVideo ? extractVimeoVideoId(formData.video_url) : '';
  const hasPreviewPlayer = isNativeVideo || (isYouTubeVideo && !!youtubeVideoId) || (isVimeoVideo && !!vimeoVideoId);

  useEffect(() => {
    setIsPortraitVideo(null);
  }, [formData.video_url]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleThumbnailFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Veuillez sélectionner un fichier image');
        return;
      }
      setSelectedThumbnailFile(file);
      setCapturedPreview(URL.createObjectURL(file));
    }
  };

  // Capturer la frame actuelle de la vidéo comme miniature
  const captureCurrentFrame = useCallback(() => {
    const vid = videoRef.current;
    if (!vid || !vid.videoWidth || !vid.videoHeight) {
      toast.error('Mettez la vidéo en pause sur la frame souhaitée');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = vid.videoWidth;
    canvas.height = vid.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `thumbnail_${Date.now()}.jpg`, { type: 'image/jpeg' });
      setSelectedThumbnailFile(file);
      setCapturedPreview(canvas.toDataURL('image/jpeg', 0.92));
      toast.success('Miniature capturée !');
    }, 'image/jpeg', 0.92);
  }, [videoRef]);

  const uploadThumbnailFile = async (file: File): Promise<string> => {
    const result = await uploadFile(file, 'lesson_discussion_files');
    return result.fileUrl;
  };

  const handleVideoMetadataLoaded = useCallback(() => {
    const vid = videoRef.current;
    if (!vid?.videoWidth || !vid.videoHeight) return;
    setIsPortraitVideo(vid.videoHeight > vid.videoWidth);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.video_url.trim()) {
      toast.error('Le titre et l\'URL de la vidéo sont requis');
      return;
    }

    try {
      let thumbnailUrl = formData.thumbnail_url;

      if (selectedThumbnailFile) {
        thumbnailUrl = await uploadThumbnailFile(selectedThumbnailFile);
      }

      const videoData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        video_url: formData.video_url.trim(),
        thumbnail_url: thumbnailUrl.trim() || null,
        video_type: formData.video_type,
        formation_id: formData.formation_id.trim() || null,
      };

      const { data: updated, error } = await supabase
        .from('videos')
        .update(videoData)
        .eq('id', video.id)
        .select()
        .maybeSingle();

      if (error) throw error;

      if (!updated) {
        toast.error("Mise à jour non appliquée (pas d'autorisation ou élément introuvable)");
        return;
      }
      
      toast.success('Vidéo modifiée avec succès');
      onSuccess();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erreur lors de la modification');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      <div>
        <Label htmlFor="title">Titre</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => handleInputChange('title', e.target.value)}
          placeholder="Titre de la vidéo"
          required
        />
      </div>
      
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder="Description de la vidéo"
          rows={3}
        />
      </div>

      {/* Section miniature avec capture vidéo */}
      <div>
        <Label>Miniature de couverture</Label>
        <div className="space-y-3 mt-1">
          {/* Lecteur vidéo pour capture */}
          {formData.video_url && (
            <div className="rounded-lg border border-border bg-black/95 p-2">
              {isNativeVideo && (
                <div className="flex justify-center">
                  <video
                    ref={videoRef}
                    src={formData.video_url}
                    crossOrigin="anonymous"
                    playsInline
                    controls
                    preload="metadata"
                    className={
                      isPortraitVideo === true
                        ? 'max-h-[26rem] w-auto max-w-full rounded-md object-contain'
                        : 'w-full max-h-64 rounded-md object-contain'
                    }
                    onLoadedMetadata={handleVideoMetadataLoaded}
                    onLoadedData={handleVideoMetadataLoaded}
                    onError={() => setIsPortraitVideo(false)}
                  />
                </div>
              )}
              {isYouTubeVideo && youtubeVideoId && (
                <div className="flex justify-center">
                  <iframe
                    src={`https://www.youtube.com/embed/${youtubeVideoId}?controls=1&rel=0&modestbranding=1&playsinline=1`}
                    title="Prévisualisation de la vidéo"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="aspect-video w-full rounded-md border-0"
                  />
                </div>
              )}
              {isVimeoVideo && vimeoVideoId && (
                <div className="flex justify-center">
                  <iframe
                    src={`https://player.vimeo.com/video/${vimeoVideoId}?controls=1&title=0&byline=0&portrait=0`}
                    title="Prévisualisation de la vidéo"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                    className="aspect-video w-full rounded-md border-0"
                  />
                </div>
              )}
              {!hasPreviewPlayer && (
                <div className="rounded-md border border-border bg-black/40 px-3 py-6 text-center text-sm text-muted-foreground">
                  Impossible de prévisualiser cette URL dans l’éditeur.
                </div>
              )}
              <div className="mt-3 flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="bg-black/60 text-white hover:bg-black/80 backdrop-blur-sm h-8 flex-1"
                  onClick={captureCurrentFrame}
                  disabled={!canCaptureFrame}
                >
                  <Camera className="h-3.5 w-3.5 mr-1.5" />
                  Capturer cette frame
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground text-center pt-2">
                {canCaptureFrame
                  ? 'Naviguez dans la vidéo puis capturez la frame souhaitée'
                  : 'La capture de frame est disponible uniquement pour les vidéos hébergées directement.'}
              </p>
            </div>
          )}

          {/* Prévisualisation de la miniature */}
          {(capturedPreview || (formData.thumbnail_url && !selectedThumbnailFile)) && (
            <div className="border border-border rounded-lg p-2">
              <img 
                src={capturedPreview || formData.thumbnail_url} 
                alt="Miniature" 
                className="w-full h-28 object-cover rounded"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {capturedPreview ? 'Nouvelle miniature capturée' : 'Miniature actuelle'}
              </p>
            </div>
          )}
          
          {/* Upload de fichier alternatif */}
          <div className="border-2 border-dashed border-border rounded-lg p-3">
            <div className="text-center">
              <Upload className="mx-auto h-6 w-6 text-muted-foreground" />
              <p className="text-xs text-muted-foreground mt-1">Ou uploadez une image</p>
              <Input
                type="file"
                accept="image/*"
                onChange={handleThumbnailFileSelect}
                className="mt-2"
              />
            </div>
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="video_type">Type de vidéo</Label>
        <Select
          value={formData.video_type}
          onValueChange={(value: 'lesson' | 'promo' | 'classic') => 
            handleInputChange('video_type', value)
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner le type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="classic">Classique</SelectItem>
            <SelectItem value="promo">Promotion</SelectItem>
            <SelectItem value="lesson">Leçon</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {(formData.video_type === 'promo' || formData.video_type === 'lesson') && (
        <div>
          <Label htmlFor="formation_id">Formation associée</Label>
          <Select
            value={formData.formation_id}
            onValueChange={(value) => handleInputChange('formation_id', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner une formation" />
            </SelectTrigger>
            <SelectContent>
              {formations.map((formation) => (
                <SelectItem key={formation.id} value={formation.id}>
                  {formation.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex space-x-2 pt-2">
        <Button type="submit" className="flex-1" disabled={isUploading}>
          {isUploading ? 'Upload en cours...' : 'Modifier'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isUploading}>
          Annuler
        </Button>
      </div>
    </form>
  );
};

export default VideoEditForm;
