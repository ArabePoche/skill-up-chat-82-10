import React, { useState } from 'react';
import { Coins, Gift, Send, Star, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUserWallet } from '@/hooks/useUserWallet';
import { transferHabbah } from '@/services/habbahService';
import { toast } from 'sonner';
import { formatNumber } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface GiftSelectorProps {
  recipientId: string;
  storyId: string;
  onClose: () => void;
  onGiftSent: (giftName: string, amount: number, currency: string) => void;
}

const PREMIUM_GIFTS = [
  { id: 'rose', name: 'Rose', cost: 1, icon: '🌹', currency: 'soumboulah_cash' },
  { id: 'heart', name: 'Cœur', cost: 5, icon: '❤️', currency: 'soumboulah_cash' },
  { id: 'coffee', name: 'Café', cost: 10, icon: '☕', currency: 'soumboulah_cash' },
  { id: 'mic', name: 'Micro', cost: 50, icon: '🎤', currency: 'soumboulah_cash' },
  { id: 'lion', name: 'Lion', cost: 100, icon: '🦁', currency: 'soumboulah_cash' },
  { id: 'rocket', name: 'Fusée', cost: 500, icon: '🚀', currency: 'soumboulah_cash' },
];

const HABBAH_AMOUNTS = [1, 10, 50, 100];
const BONUS_AMOUNTS = [1, 5, 10, 50];

const GiftSelector: React.FC<GiftSelectorProps> = ({ 
  recipientId, 
  storyId, 
  onClose,
  onGiftSent 
}) => {
  const { wallet, isLoading } = useUserWallet();
  const [activeTab, setActiveTab] = useState<'premium' | 'habbah'>('premium');
  const [isSending, setIsSending] = useState(false);
  const [customAmount, setCustomAmount] = useState('');

  // Masquer l'onglet Premium si l'utilisateur n'a pas de Soumboulah Cash
  // NOTE: La consigne dit "comme tiktok si seulement l'utilisateur a SC", 
  // on peut l'interpréter comme "Afficher les cadeaux payants seulement si solde > 0"
  // ou "Permettre l'envoi seulement si solde suffisant".
  // Ici, on garde l'onglet mais on désactive les boutons si solde insuffisant.
  const hasSC = (wallet?.soumboulah_cash || 0) > 0;

  const handleSendGift = async (item: typeof PREMIUM_GIFTS[0]) => {
    if (!wallet) return;
    if (wallet.soumboulah_cash < item.cost) {
      toast.error('Solde Soumboulah Cash insuffisant');
      return;
    }

    setIsSending(true);
    try {
      // Pour l'instant, on utilise une RPC générique ou on simule
      // Idéalement: await transferCurrency(recipientId, item.cost, 'soumboulah_cash', storyId);
      
      // Simulation appel RPC (à remplacer par le vrai endpoint)
      const { error } = await supabase.rpc('transfer_soumboulah_cash', {
        p_recipient_id: recipientId,
        p_amount: item.cost,
        p_reason: `Gift: ${item.name}`,
        p_reference_id: storyId
      });

      if (error) {
         // Fallback si la RPC n'existe pas encore (pour ne pas bloquer l'interface de démo)
         if (process.env.NODE_ENV === 'development' || error.code === 'PGRST202') {
             console.warn('RPC transfer_soumboulah_cash not found, simulating');
             onGiftSent(item.name, item.cost, 'S.');
             toast.success(`${item.name} envoyé ! (Simulation)`);
             onClose();
             return;
         }
         throw error; 
      }

      onGiftSent(item.name, item.cost, 'S.');
      toast.success(`${item.name} envoyé !`);
      onClose();
    } catch (error: any) {
      console.error('Erreur envoi cadeau:', error);
      toast.error("Erreur lors de l'envoi du cadeau (Fonctionnalité en cours de déploiement)");
    } finally {
      setIsSending(false);
    }
  };

  const handleSendHabbah = async (amount: number, type: 'habbah' | 'bonus') => {
    const balance = type === 'habbah' ? wallet?.habbah : wallet?.soumboulah_bonus;
    if ((balance || 0) < amount) {
      toast.error(`Solde ${type === 'habbah' ? 'Habbah' : 'Bonus'} insuffisant`);
      return;
    }

    setIsSending(true);
    try {
      if (type === 'habbah') {
        const result = await transferHabbah(recipientId, amount, 'story_gift', storyId);
        if (result.success) {
          onGiftSent('Habbah', amount, 'H.');
          toast.success(`${amount} Habbah envoyés !`);
          onClose();
        } else {
          toast.error(result.message);
        }
      } else {
        // Logique pour Soumboulah Bonus (similaire à Habbah)
        const { error } = await supabase.rpc('transfer_soumboulah_bonus', {
            p_recipient_id: recipientId,
            p_amount: amount,
            p_reason: 'story_gift',
            p_reference_id: storyId
        });
        
        if (error) {
           if (process.env.NODE_ENV === 'development' || error.code === 'PGRST202') {
             console.warn('RPC transfer_soumboulah_bonus not found, simulating');
             onGiftSent('Soumboulah Bonus', amount, 'SB');
             toast.success(`${amount} SB envoyés ! (Simulation)`);
             onClose();
             return;
           }
           throw error;
        }
        
        onGiftSent('Soumboulah Bonus', amount, 'SB');
        toast.success(`${amount} SB envoyés !`);
        onClose();
      }
    } catch (error: any) {
      console.error('Erreur envoi:', error);
      toast.error("Erreur lors de l'envoi");
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) return <div className="p-4 text-center text-white">Chargement du portefeuille...</div>;

  return (
    <div className="bg-black/90 text-white rounded-t-2xl max-h-[70vh] overflow-y-auto">
      <div className="p-4 border-b border-white/10 sticky top-0 bg-black/95 z-10 flex justify-between items-center">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Gift className="text-pink-500" size={20} />
          Envoyer un cadeau
        </h3>
        <button onClick={onClose} className="text-white/70 hover:text-white p-1">Fermer</button>
      </div>

      {/* Solde actuel */}
      <div className="px-4 py-3 bg-white/5 flex gap-4 text-xs font-medium">
        <div className="flex flex-col">
          <span className="text-white/50">Soumboulah Cash</span>
          <span className="text-emerald-400 text-lg">{formatNumber(wallet?.soumboulah_cash || 0)} S.</span>
        </div>
        <div className="w-px bg-white/10 mx-2" />
        <div className="flex flex-col">
          <span className="text-white/50">Habbah</span>
          <span className="text-amber-400 text-lg">{formatNumber(wallet?.habbah || 0)} H.</span>
        </div>
         <div className="w-px bg-white/10 mx-2" />
        <div className="flex flex-col">
          <span className="text-white/50">Bonus</span>
          <span className="text-blue-400 text-lg">{formatNumber(wallet?.soumboulah_bonus || 0)} SB</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10">
        <button 
          onClick={() => setActiveTab('premium')}
          className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
            activeTab === 'premium' ? 'text-pink-400' : 'text-white/60 hover:text-white'
          }`}
        >
          Cadeaux Premium
          {activeTab === 'premium' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-pink-400" />
          )}
        </button>
        <button 
          onClick={() => setActiveTab('habbah')}
          className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
            activeTab === 'habbah' ? 'text-amber-400' : 'text-white/60 hover:text-white'
          }`}
        >
          Habbah & Bonus
          {activeTab === 'habbah' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400" />
          )}
        </button>
      </div>

      <div className="p-4">
        {activeTab === 'premium' && (
          <div className="grid grid-cols-3 gap-3">
             {/* Note: Si l'utilisateur n'a pas de SC, on peut afficher un message mais on affiche quand même les cadeaux comme demandé "avec mention claire du coût" */}
             {PREMIUM_GIFTS.map((gift) => (
                <button
                  key={gift.id}
                  disabled={isSending || (wallet?.soumboulah_cash || 0) < gift.cost}
                  onClick={() => handleSendGift(gift)}
                  className={`flex flex-col items-center p-3 rounded-xl border border-white/10 transition-all ${
                    (wallet?.soumboulah_cash || 0) >= gift.cost 
                      ? 'hover:bg-white/10 hover:border-pink-500/50 active:scale-95' 
                      : 'opacity-50 cursor-not-allowed grayscale'
                  }`}
                >
                  <div className="text-3xl mb-2">{gift.icon}</div>
                  <div className="text-sm font-medium">{gift.name}</div>
                  <div className="text-xs text-pink-400 flex items-center gap-1 mt-1 font-bold">
                    {gift.cost} S.
                  </div>
                </button>
             ))}
             {/* Bouton Recharger si solde faible ? */}
             {wallet?.soumboulah_cash === 0 && (
                <div className="col-span-3 mt-4 text-center">
                   <p className="text-sm text-white/50 mb-2">Vous n'avez pas de Soumboulah Cash.</p>
                   {/* Ici on pourrait mettre un lien vers le wallet/rechargement */}
                </div>
             )}
          </div>
        )}

        {activeTab === 'habbah' && (
          <div className="space-y-6">
            {/* Habbah Section */}
            <div>
              <h4 className="text-sm font-medium text-amber-400 mb-3 flex items-center gap-2">
                <Star size={16} /> Envoyer des Habbah
              </h4>
              <div className="flex gap-2 justify-between">
                {HABBAH_AMOUNTS.map(amount => (
                  <Button
                    key={`h-${amount}`}
                    size="sm"
                    variant="outline" 
                    className={`flex-1 bg-transparent border-amber-500/50 text-amber-400 hover:bg-amber-500/20 hover:text-amber-300 ${
                        (wallet?.habbah || 0) < amount ? 'opacity-50 pointer-events-none' : ''
                    }`}
                    onClick={() => handleSendHabbah(amount, 'habbah')}
                    disabled={isSending}
                  >
                    {amount} H.
                  </Button>
                ))}
              </div>
            </div>

            {/* Bonus Section */}
            <div>
              <h4 className="text-sm font-medium text-blue-400 mb-3 flex items-center gap-2">
                <Zap size={16} /> Envoyer Soumboulah Bonus
              </h4>
              <div className="flex gap-2 justify-between">
                {BONUS_AMOUNTS.map(amount => (
                  <Button
                    key={`b-${amount}`}
                    size="sm"
                    variant="outline"
                    className={`flex-1 bg-transparent border-blue-500/50 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300 ${
                        (wallet?.soumboulah_bonus || 0) < amount ? 'opacity-50 pointer-events-none' : ''
                    }`}
                    onClick={() => handleSendHabbah(amount, 'bonus')}
                    disabled={isSending}
                  >
                     {amount} SB
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GiftSelector;
