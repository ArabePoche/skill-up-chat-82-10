import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { AlertCircle, Clock, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCreateFormationPreRegistration } from '@/hooks/useFormationPreRegistrations';
import { isFormationProfileComplete } from '@/utils/formationProfileRequirements';

interface PreInscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  formation: {
    id: string;
    title: string;
    description?: string;
  };
}

const PreInscriptionModal: React.FC<PreInscriptionModalProps> = ({
  isOpen,
  onClose,
  formation,
}) => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [motivation, setMotivation] = useState('');
  const createPreRegistration = useCreateFormationPreRegistration();

  const { data: fullProfile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['formation-pre-registration-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        return null;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, username, email, phone, country, gender')
        .eq('id', user.id)
        .single();

      if (error) {
        throw error;
      }

      return data;
    },
    enabled: !!user?.id && isOpen,
  });

  const displayName = useMemo(() => {
    const firstName = fullProfile?.first_name || profile?.first_name || '';
    const lastName = fullProfile?.last_name || profile?.last_name || '';

    return `${firstName} ${lastName}`.trim() || fullProfile?.username || profile?.username || 'Profil utilisateur';
  }, [fullProfile, profile]);

  const profileIsComplete = isFormationProfileComplete(fullProfile);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('Connectez-vous pour vous pré-inscrire.');
      onClose();
      navigate('/auth');
      return;
    }

    try {
      await createPreRegistration.mutateAsync({
        formationId: formation.id,
        userId: user.id,
        motivation,
      });

      setMotivation('');
      onClose();
    } catch (error) {
      console.error('Pre-registration failed:', error);
    }
  };

  const handleGoToCompleteProfile = () => {
    onClose();
    navigate('/complete-profile');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-600">
            <Clock size={20} />
            Pré-inscription
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
            <h3 className="mb-2 font-semibold text-orange-800">{formation.title}</h3>
            <p className="text-sm text-orange-700">
              Cette formation est en cours de construction. Votre profil sera utilisé pour enregistrer votre pré-inscription et vous prévenir dès son activation.
            </p>
          </div>

          {!user ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                Connectez-vous pour utiliser les informations déjà enregistrées dans votre compte.
              </div>
              <Button className="w-full" onClick={() => { onClose(); navigate('/auth'); }}>
                Se connecter
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="rounded-lg border bg-slate-50 p-4 text-sm">
                <p className="font-medium text-slate-900">{displayName}</p>
                <p className="text-slate-600">{fullProfile?.email || profile?.email || user.email || 'Email non renseigné'}</p>
                <p className="text-slate-600">Téléphone : {fullProfile?.phone || 'Non renseigné'}</p>
                <p className="text-slate-600">Pays : {fullProfile?.country || 'Non renseigné'}</p>
                <p className="text-slate-600">Genre : {fullProfile?.gender || 'Non renseigné'}</p>
              </div>

              {!isProfileLoading && !profileIsComplete && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  <div className="mb-2 flex items-center gap-2 font-medium">
                    <AlertCircle size={16} />
                    Complétez votre profil avant de vous pré-inscrire.
                  </div>
                  <p>Les mêmes informations obligatoires que pour l'inscription sont requises : téléphone, pays et genre.</p>
                  <Button type="button" variant="outline" className="mt-3 w-full" onClick={handleGoToCompleteProfile}>
                    Compléter mon profil
                  </Button>
                </div>
              )}

              <div>
                <Label htmlFor="motivation">Pourquoi cette formation vous intéresse-t-elle ?</Label>
                <Textarea
                  id="motivation"
                  value={motivation}
                  onChange={(e) => setMotivation(e.target.value)}
                  placeholder="Dites-nous ce qui vous motive..."
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                  disabled={createPreRegistration.isPending}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={createPreRegistration.isPending || isProfileLoading || !profileIsComplete}
                  className="flex-1 bg-orange-500 hover:bg-orange-600"
                >
                  {createPreRegistration.isPending ? (
                    'Envoi...'
                  ) : (
                    <>
                      <Send size={16} className="mr-2" />
                      Je me pré-inscris
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PreInscriptionModal;
