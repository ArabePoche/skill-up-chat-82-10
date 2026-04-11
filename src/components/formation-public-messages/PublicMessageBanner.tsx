import React from 'react';
import { BellRing, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { FormationPublicMessage } from '@/hooks/formation-public-messages/useFormationPublicMessages';

interface PublicMessageBannerProps {
  messages: FormationPublicMessage[];
  onOpenMessage: (message: FormationPublicMessage) => void;
  className?: string;
}

const PublicMessageBanner: React.FC<PublicMessageBannerProps> = ({
  messages,
  onOpenMessage,
  className,
}) => {
  if (messages.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-3', className)}>
      {messages.map((message) => (
        <div
          key={message.id}
          className="rounded-2xl border border-amber-200 bg-amber-50/95 px-4 py-3 shadow-sm"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge className="bg-amber-600 text-white hover:bg-amber-600">
                  <BellRing className="mr-1 h-3.5 w-3.5" />
                  Message public
                </Badge>
                {message.urgent && (
                  <Badge variant="destructive">Urgent déjà consulté</Badge>
                )}
                <Badge variant="outline">
                  {message.media_type === 'video' ? 'Vidéo' : 'Audio'}
                </Badge>
              </div>
              <p className="truncate text-sm font-semibold text-slate-900">
                {message.title?.trim() || 'Message public du créateur'}
              </p>
              {message.description && (
                <p className="mt-1 line-clamp-2 text-sm text-slate-600">{message.description}</p>
              )}
            </div>

            <Button
              onClick={() => onOpenMessage(message)}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              <PlayCircle className="mr-2 h-4 w-4" />
              Lire
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PublicMessageBanner;