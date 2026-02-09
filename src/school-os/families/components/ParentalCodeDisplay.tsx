// Affiche le code parental d'une famille avec option de copie
import React, { useState } from 'react';
import { Copy, Check, Key } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ParentalCodeDisplayProps {
  code: string | null;
  label?: string;
  compact?: boolean;
}

export const ParentalCodeDisplay: React.FC<ParentalCodeDisplayProps> = ({
  code,
  label = 'Code Parental',
  compact = false,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success('Code copié !');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Impossible de copier le code');
    }
  };

  if (!code) {
    return (
      <span className="text-xs text-muted-foreground italic">Aucun code</span>
    );
  }

  if (compact) {
    return (
      <Badge
        variant="outline"
        className="cursor-pointer font-mono gap-1"
        onClick={handleCopy}
      >
        <Key className="w-3 h-3" />
        {code}
        {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
      </Badge>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Key className="w-4 h-4 text-muted-foreground" />
      <div>
        <p className="text-sm font-medium">{label}</p>
        <div className="flex items-center gap-2">
          <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded">
            {code}
          </code>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopy}>
            {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
          </Button>
        </div>
      </div>
    </div>
  );
};
