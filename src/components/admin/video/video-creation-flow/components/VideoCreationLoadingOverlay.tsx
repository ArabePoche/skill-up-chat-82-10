// Overlay reutilisable affiche pendant les traitements asynchrones du flux video.
import { Loader2 } from 'lucide-react';

interface VideoCreationLoadingOverlayProps {
  isVisible: boolean;
  label: string;
}

export const VideoCreationLoadingOverlay = ({ isVisible, label }: VideoCreationLoadingOverlayProps) => {
  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4">
      <div className="rounded-3xl bg-white p-6 text-center shadow-2xl">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-orange-500" />
        <p className="mt-4 text-sm font-medium text-zinc-900">{label || 'Traitement en cours'}</p>
      </div>
    </div>
  );
};