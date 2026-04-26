// Modal de partage vidéo - design moderne en bottom sheet
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy, Facebook, MessageCircle, Linkedin, Mail, Send, Share2, Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface VideoShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
}

interface SharePlatform {
  key: string;
  label: string;
  icon: React.ReactNode;
  bg: string;
  buildUrl: (url: string, text: string) => string;
}

const SHARE_PLATFORMS: SharePlatform[] = [
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    icon: <MessageCircle className="h-6 w-6 text-white" />,
    bg: 'bg-[#25D366]',
    buildUrl: (u, t) => `https://wa.me/?text=${encodeURIComponent(`${t} ${u}`)}`,
  },
  {
    key: 'facebook',
    label: 'Facebook',
    icon: <Facebook className="h-6 w-6 text-white" />,
    bg: 'bg-[#1877F2]',
    buildUrl: (u) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}`,
  },
  {
    key: 'twitter',
    label: 'X (Twitter)',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white" aria-hidden="true">
        <path d="M18.244 2H21l-6.51 7.44L22.5 22h-6.79l-5.32-6.96L4.32 22H1.56l6.96-7.96L1.5 2h6.94l4.81 6.36L18.244 2zm-1.19 18h1.84L7.04 4H5.13l11.924 16z" />
      </svg>
    ),
    bg: 'bg-black',
    buildUrl: (u, t) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(u)}&text=${encodeURIComponent(t)}`,
  },
  {
    key: 'telegram',
    label: 'Telegram',
    icon: <Send className="h-6 w-6 text-white" />,
    bg: 'bg-[#229ED9]',
    buildUrl: (u, t) => `https://t.me/share/url?url=${encodeURIComponent(u)}&text=${encodeURIComponent(t)}`,
  },
  {
    key: 'linkedin',
    label: 'LinkedIn',
    icon: <Linkedin className="h-6 w-6 text-white" />,
    bg: 'bg-[#0A66C2]',
    buildUrl: (u) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(u)}`,
  },
  {
    key: 'email',
    label: 'E-mail',
    icon: <Mail className="h-6 w-6 text-white" />,
    bg: 'bg-gradient-to-br from-orange-500 to-red-500',
    buildUrl: (u, t) => `mailto:?subject=${encodeURIComponent(t)}&body=${encodeURIComponent(`${t}\n\n${u}`)}`,
  },
];

const VideoShareModal: React.FC<VideoShareModalProps> = ({
  isOpen,
  onClose,
  url,
  title,
  description,
  thumbnailUrl,
}) => {
  const [copied, setCopied] = useState(false);
  const text = description ? `${title} – ${description}` : title;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Lien copié !');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Impossible de copier le lien");
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({ title, text: description || title, url });
        onClose();
      } catch {
        // Annulé par l'utilisateur — pas d'erreur visible
      }
    }
  };

  const handleShare = (platform: SharePlatform) => {
    const shareUrl = platform.buildUrl(url, text);
    if (platform.key === 'email') {
      window.location.href = shareUrl;
    } else {
      window.open(shareUrl, '_blank', 'noopener,noreferrer,width=640,height=560');
    }
    onClose();
  };

  const hasNativeShare =
    typeof navigator !== 'undefined' && typeof (navigator as any).share === 'function';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="
          p-0 gap-0 border-0 overflow-hidden bg-white
          rounded-t-3xl rounded-b-none sm:rounded-3xl
          w-full sm:max-w-md
          fixed left-0 right-0 bottom-0 top-auto translate-y-0 translate-x-0
          sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:-translate-x-1/2 sm:-translate-y-1/2
          max-h-[90vh] data-[state=open]:slide-in-from-bottom
        "
      >
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-2 sm:hidden">
          <div className="h-1.5 w-12 rounded-full bg-gray-300" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <DialogTitle className="text-lg font-bold text-gray-900">
            Partager
          </DialogTitle>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Aperçu de la vidéo */}
        <div className="mx-5 mb-4 flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-3">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt=""
              className="h-14 w-14 flex-shrink-0 rounded-xl object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500">
              <Share2 className="h-6 w-6 text-white" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-gray-900">{title}</p>
            {description ? (
              <p className="truncate text-xs text-gray-500">{description}</p>
            ) : (
              <p className="truncate text-xs text-gray-400">Vidéo REZO</p>
            )}
          </div>
        </div>

        {/* Plateformes (horizontale scrollable) */}
        <div className="px-5">
          <div className="flex gap-3 overflow-x-auto pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {hasNativeShare && (
              <button
                onClick={handleNativeShare}
                className="flex w-16 flex-shrink-0 flex-col items-center gap-1.5"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 shadow-md transition active:scale-95">
                  <Share2 className="h-6 w-6 text-white" />
                </div>
                <span className="text-[11px] font-medium text-gray-700">Partager</span>
              </button>
            )}
            {SHARE_PLATFORMS.map((p) => (
              <button
                key={p.key}
                onClick={() => handleShare(p)}
                className="flex w-16 flex-shrink-0 flex-col items-center gap-1.5"
              >
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-full ${p.bg} shadow-md transition active:scale-95 hover:scale-105`}
                >
                  {p.icon}
                </div>
                <span className="text-[11px] font-medium text-gray-700 text-center leading-tight">
                  {p.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Lien + bouton Copier */}
        <div className="border-t border-gray-100 px-5 py-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Lien direct
          </p>
          <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2">
            <span className="flex-1 truncate text-sm text-gray-700" title={url}>
              {url}
            </span>
            <Button
              size="sm"
              onClick={handleCopyLink}
              className={`h-9 flex-shrink-0 rounded-xl px-3 font-semibold transition ${
                copied
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-gray-900 text-white hover:bg-gray-800'
              }`}
            >
              {copied ? (
                <>
                  <Check className="mr-1 h-4 w-4" />
                  Copié
                </>
              ) : (
                <>
                  <Copy className="mr-1 h-4 w-4" />
                  Copier
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Safe area iPhone */}
        <div className="h-[env(safe-area-inset-bottom)] sm:h-0" />
      </DialogContent>
    </Dialog>
  );
};

export default VideoShareModal;
