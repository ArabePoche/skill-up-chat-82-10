// Etape de publication qui centralise apercu, miniature et metadonnees video.
import { FileText, ImagePlus, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { CreationMethod, FormationOption, VideoFormData } from '../types';

interface VideoCreationDetailsStepProps {
  method: CreationMethod | null;
  sourcePreviewUrl: string;
  detailsPreviewSource: string;
  thumbnailPreviewUrl: string;
  videoUrl: string;
  formData: VideoFormData;
  formations: FormationOption[];
  isUploading: boolean;
  isProcessing: boolean;
  detailsPreviewVideoRef: React.RefObject<HTMLVideoElement>;
  onChangeVideoUrl: (value: string) => void;
  onChangeFormData: (updater: (current: VideoFormData) => VideoFormData) => void;
  onUploadVideoSelection: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onCaptureThumbnail: () => void;
  onThumbnailUploadSelection: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onBack: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
}

export const VideoCreationDetailsStep = ({
  method,
  sourcePreviewUrl,
  detailsPreviewSource,
  thumbnailPreviewUrl,
  videoUrl,
  formData,
  formations,
  isUploading,
  isProcessing,
  detailsPreviewVideoRef,
  onChangeVideoUrl,
  onChangeFormData,
  onUploadVideoSelection,
  onCaptureThumbnail,
  onThumbnailUploadSelection,
  onBack,
  onSaveDraft,
  onPublish,
}: VideoCreationDetailsStepProps) => (
  <DialogContent className="max-w-5xl overflow-hidden border-0 bg-white p-0 sm:rounded-3xl">
    <DialogHeader className="sr-only">
      <DialogTitle>Informations de publication</DialogTitle>
      <DialogDescription>Renseignez le titre, la description et la miniature de votre video.</DialogDescription>
    </DialogHeader>
    <div className="grid max-h-[88vh] gap-0 md:grid-cols-[0.95fr_1.05fr]">
      <div className="overflow-y-auto border-r bg-zinc-950 p-6 text-white">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/8 px-3 py-1 text-xs uppercase tracking-[0.24em] text-orange-200">
          <ImagePlus size={14} />
          Apercu
        </div>
        <h2 className="mt-3 text-2xl font-semibold">Infos et miniature</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-300">
          Choisissez la frame de couverture ou importez votre image, puis renseignez les informations de la publication.
        </p>

        <div className="mt-6 rounded-3xl border border-white/10 bg-black/40 p-4">
          {method === 'url' ? (
            <div className="space-y-3">
              <Label className="text-zinc-200">URL de la video</Label>
              <Input value={videoUrl} onChange={(event) => onChangeVideoUrl(event.target.value)} placeholder="https://example.com/video.mp4" className="border-white/10 bg-black/20 text-white" />
              {detailsPreviewSource && (
                <video ref={detailsPreviewVideoRef} src={detailsPreviewSource} controls className="aspect-[9/16] w-full rounded-2xl bg-black object-cover" />
              )}
            </div>
          ) : sourcePreviewUrl ? (
            <video ref={detailsPreviewVideoRef} src={sourcePreviewUrl} controls className="aspect-[9/16] w-full rounded-2xl bg-black object-cover" />
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 p-4">
              <Label className="text-zinc-200">Importer une video</Label>
              <Input type="file" accept="video/*" onChange={onUploadVideoSelection} className="mt-3 border-white/10 bg-black/20 text-white" />
            </div>
          )}
        </div>

        <div className="mt-5 rounded-3xl border border-white/10 bg-white/5 p-4">
          <Label className="text-zinc-200">Miniature</Label>
          <div className="mt-3 space-y-3">
            <p className="text-xs leading-5 text-zinc-400">
              Une miniature est proposee automatiquement au debut de la video. Pour en choisir une autre, lancez la video ci-dessus, mettez-la en pause sur la frame voulue, puis capturez.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" className="bg-white/10 text-white hover:bg-white/20" onClick={onCaptureThumbnail} disabled={isProcessing || !detailsPreviewSource}>
                Capturer la frame en pause
              </Button>
              <Label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-200 transition hover:bg-white/10">
                Uploader une image
                <input type="file" accept="image/*" onChange={onThumbnailUploadSelection} className="hidden" />
              </Label>
            </div>
            {thumbnailPreviewUrl && <img src={thumbnailPreviewUrl} alt="Miniature choisie" className="aspect-video w-full rounded-2xl object-cover" />}
          </div>
        </div>
      </div>

      <div className="overflow-y-auto p-6">
        <DialogHeader className="text-left">
          <DialogTitle className="text-2xl">Publier la video</DialogTitle>
          <DialogDescription>
            Finalisez les informations visibles par vos amis, vos suivis et le reste de l'audience.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-5">
          <div>
            <Label htmlFor="video-title">Titre</Label>
            <Input id="video-title" value={formData.title} onChange={(event) => onChangeFormData((current) => ({ ...current, title: event.target.value }))} placeholder="Donnez envie de regarder la video" className="mt-2" />
          </div>

          <div>
            <Label htmlFor="video-description">Description</Label>
            <Textarea id="video-description" value={formData.description} onChange={(event) => onChangeFormData((current) => ({ ...current, description: event.target.value }))} placeholder="Decrivez votre contenu" rows={5} className="mt-2" />
          </div>

          <div>
            <Label htmlFor="video-type">Type de video</Label>
            <Select value={formData.video_type} onValueChange={(value: 'lesson' | 'promo' | 'classic') => onChangeFormData((current) => ({ ...current, video_type: value }))}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Selectionner le type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="classic">Classique</SelectItem>
                <SelectItem value="promo">Promotion</SelectItem>
                <SelectItem value="lesson">Lecon</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(formData.video_type === 'promo' || formData.video_type === 'lesson') && (
            <div>
              <Label htmlFor="video-formation">Formation associee</Label>
              <Select value={formData.formation_id} onValueChange={(value) => onChangeFormData((current) => ({ ...current, formation_id: value }))}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Selectionner une formation" />
                </SelectTrigger>
                <SelectContent>
                  {formations.length === 0 ? (
                    <SelectItem value="no-formations" disabled>
                      Aucune formation disponible
                    </SelectItem>
                  ) : (
                    formations.map((formation) => (
                      <SelectItem key={formation.id} value={formation.id}>
                        {formation.title}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-600">
            <p>
              Les stickers, textes et sons choisis seront appliques au parcours <strong>Filmer</strong>. Pour l'URL et l'upload, la miniature peut etre capturee a partir du clip ou fournie par une image.
            </p>
          </div>

          <div className="flex flex-wrap justify-between gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onBack}>
              Retour
            </Button>
            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="outline" onClick={onSaveDraft} disabled={isUploading || isProcessing}>
                {(isUploading || isProcessing) ? <Loader2 size={16} className="mr-2 animate-spin" /> : <FileText size={16} className="mr-2" />}
                Brouillon
              </Button>
              <Button type="button" className="bg-orange-500 text-white hover:bg-orange-400" onClick={onPublish} disabled={isUploading || isProcessing}>
                {(isUploading || isProcessing) ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Upload size={16} className="mr-2" />}
                Publier
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </DialogContent>
);