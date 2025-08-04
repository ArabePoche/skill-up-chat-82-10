import React from 'react';
import { Phone, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface CallButtonProps {
  type: 'audio' | 'video';
  onCall: (type: 'audio' | 'video') => Promise<boolean>;
  disabled?: boolean;
  className?: string;
}

const CallButton: React.FC<CallButtonProps> = ({ type, onCall, disabled, className }) => {
  const [isLoading, setIsLoading] = React.useState(false);

  const handleClick = async () => {
    if (disabled || isLoading) return;

    setIsLoading(true);
    try {
      await onCall(type);
    } catch (error) {
      console.error(`Error initiating ${type} call:`, error);
      toast.error(`Erreur lors de l'appel ${type === 'audio' ? 'audio' : 'vidéo'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const Icon = type === 'video' ? Video : Phone;
  
  return (
    <Button
      onClick={handleClick}
      disabled={disabled || isLoading}
      variant="outline"
      size="sm"
      className={className}
      title={`Appel ${type === 'video' ? 'vidéo' : 'audio'}`}
    >
      <Icon size={16} />
      {isLoading && <span className="ml-1">...</span>}
    </Button>
  );
};

export default CallButton;