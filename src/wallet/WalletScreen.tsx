// Écran principal du portefeuille multi-devises Habbah & Soumboulah
import React, { useState } from 'react';
import { ArrowLeft, RefreshCw, ShoppingBag, BookOpen, Gift, Heart, ArrowDownUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUserWallet } from '@/hooks/useUserWallet';
import { useCurrencySettings } from '@/hooks/admin/useCurrencySettings';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate, Link } from 'react-router-dom';
import coinHabbah from '@/assets/coin-habbah.png';
import coinSB from '@/assets/coin-soumboulah-bonus.png';
import coinSC from '@/assets/coin-soumboulah-cash.png';

const formatNumber = (n: number) =>
  new Intl.NumberFormat('fr-FR').format(n);

const currencyLabel: Record<string, string> = {
  soumboulah_cash: 'Soumboulah Cash',
  soumboulah_bonus: 'Soumboulah Bonus',
  habbah: 'Habbah',
};
const currencySymbol: Record<string, string> = {
  soumboulah_cash: 'S.',
  soumboulah_bonus: 'SB',
  habbah: 'H.',
};
const currencyCoin: Record<string, string> = {
  soumboulah_cash: coinSC,
  soumboulah_bonus: coinSB,
  habbah: coinHabbah,
};

const WalletScreen: React.FC = () => {
  const navigate = useNavigate();
  const { wallet, isLoading, transactions, convertHabbah, isConverting } = useUserWallet();
  const { conversion } = useCurrencySettings();
  const scToFcfaRate = conversion?.sc_to_fcfa_rate || 1;
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [convertAmount, setConvertAmount] = useState('');

  const handleConvert = () => {
    const amount = parseInt(convertAmount);
    if (!amount || amount < 100 || amount % 100 !== 0) return;
    convertHabbah(amount);
    setShowConvertDialog(false);
    setConvertAmount('');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950">
      {/* Header */}
      <div className="relative px-4 pt-12 pb-6 overflow-hidden">
        {/* Fond avec effet tech bleuté */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-blue-950/80 to-slate-900" />
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 50% 50%, hsl(200 80% 60% / 0.3) 0%, transparent 60%)',
        }} />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => navigate(-1)} className="p-1 text-white/80 hover:text-white">
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white" style={{ fontFamily: "'Georgia', serif" }}>
                Mon Portefeuille
              </h1>
              <p className="text-blue-300/70 text-sm">Habbah & Soumboulah</p>
            </div>
          </div>

          {/* Trois pièces avec soldes */}
          <div className="flex items-end justify-center gap-2 mt-2">
            {/* Habbah */}
            <div className="flex flex-col items-center flex-1">
              <div className="relative">
                <img src={coinHabbah} alt="Habbah" className="w-20 h-20 object-contain drop-shadow-[0_0_15px_rgba(180,120,40,0.5)]" />
              </div>
              <p className="text-2xl font-bold text-white mt-2">
                {formatNumber(wallet?.habbah || 0)}
              </p>
              <p className="text-amber-400/80 text-xs font-semibold uppercase tracking-wider">Habbah</p>
              <Button
                size="sm"
                className="mt-2 bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border border-amber-500/30 text-[10px] h-7 px-3"
                onClick={() => setShowConvertDialog(true)}
              >
                Convertir en SB
              </Button>
            </div>

            {/* Soumboulah Bonus */}
            <div className="flex flex-col items-center flex-1">
              <div className="relative">
                <img src={coinSB} alt="Soumboulah Bonus" className="w-24 h-24 object-contain drop-shadow-[0_0_20px_rgba(180,200,220,0.4)]" />
              </div>
              <p className="text-2xl font-bold text-white mt-2">
                {formatNumber(wallet?.soumboulah_bonus || 0)}
              </p>
              <p className="text-slate-300/80 text-xs font-semibold uppercase tracking-wider">Bonus</p>
              <span className="mt-2 text-[10px] text-slate-400 bg-white/5 px-2 py-1 rounded-full">
                Cours & Abos
              </span>
            </div>

            {/* Soumboulah Cash */}
            <div className="flex flex-col items-center flex-1">
              <div className="relative">
                <img src={coinSC} alt="Soumboulah Cash" className="w-20 h-20 object-contain drop-shadow-[0_0_15px_rgba(220,180,40,0.5)]" />
              </div>
              <p className="text-2xl font-bold text-white mt-2">
                {formatNumber(wallet?.soumboulah_cash || 0)}
              </p>
              <p className="text-yellow-400/80 text-xs font-semibold uppercase tracking-wider">Cash</p>
              <p className="text-yellow-500/60 text-[10px] mt-1">
                ≈ {formatNumber((wallet?.soumboulah_cash || 0) * scToFcfaRate)} FCFA
              </p>
              <Button
                size="sm"
                className="mt-1 bg-yellow-600/30 hover:bg-yellow-600/50 text-yellow-200 border border-yellow-500/30 text-[10px] h-7 px-3"
              >
                Recharger
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="px-4 py-5">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
          Actions Rapides
        </h2>
        <div className="grid grid-cols-4 gap-3">
          {[
            { icon: ShoppingBag, label: 'Shopping', color: 'bg-blue-500/20 text-blue-400' },
            { icon: BookOpen, label: "S'abonner\nCours", color: 'bg-emerald-500/20 text-emerald-400' },
            { icon: Gift, label: 'Offrir\nCadeaux', color: 'bg-orange-500/20 text-orange-400' },
            { icon: Heart, label: 'Aides\nSolidaires', color: 'bg-pink-500/20 text-pink-400' },
          ].map((action, i) => (
            <button key={i} className="flex flex-col items-center gap-1.5">
              <div className={`w-12 h-12 rounded-full ${action.color} flex items-center justify-center`}>
                <action.icon size={22} />
              </div>
              <span className="text-xs text-center font-medium text-slate-300 whitespace-pre-line leading-tight">
                {action.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Dernières transactions */}
      <div className="px-4 pb-24">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
          Dernières Transactions
        </h2>
        {transactions.filter(tx => tx.transaction_type !== 'commission').length === 0 ? (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-6 text-center text-slate-400 text-sm">
              Aucune transaction pour le moment
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {transactions.filter(tx => tx.transaction_type !== 'commission').map((tx) => {
              let metadata: any = {};
              try {
                if (typeof tx.metadata === 'string') {
                  metadata = JSON.parse(tx.metadata);
                } else if (tx.metadata && typeof tx.metadata === 'object') {
                  metadata = tx.metadata;
                }
                
                if (typeof tx.description === 'string' && tx.description.trim().startsWith('{') && tx.description.trim().endsWith('}')) {
                  const descData = JSON.parse(tx.description);
                  metadata = { ...metadata, ...descData };
                }
              } catch (e) {
                console.error("Failed to parse metadata", e);
              }

              const isGift = tx.transaction_type === 'gift_sent' || tx.transaction_type === 'gift_received';
              const coinIcon = currencyCoin[tx.currency] || coinHabbah;

              if (isGift && metadata && (metadata.partner_name || metadata.receiver_name || metadata.sender_name || metadata.gift_name || metadata.gift_reason)) {
                const partnerName = metadata.partner_name || metadata.receiver_name || metadata.sender_name || 'Utilisateur';
                const partnerAvatar = metadata.partner_avatar || metadata.receiver_avatar || metadata.sender_avatar;
                
                const explicitGiftName = metadata.gift_name || metadata.giftName;
                const rawVideoTitle = metadata.video_title || metadata.post_title;
                
                let giftName = explicitGiftName;
                let videoTitle = rawVideoTitle;

                if (!explicitGiftName) {
                   if (rawVideoTitle) {
                       giftName = 'Cadeau vidéo';
                   } else if (metadata.gift_reason && metadata.gift_reason !== 'gift') {
                       videoTitle = metadata.gift_reason;
                       giftName = 'Cadeau vidéo';
                   } else {
                       giftName = 'Cadeau';
                   }
                }

                if (giftName && videoTitle && giftName === videoTitle) {
                    giftName = 'Cadeau vidéo';
                }

                const partnerId = metadata.partner_id || metadata.receiver_id || metadata.sender_id;
                
                return (
                  <Card key={tx.id} className="bg-slate-800/50 border-slate-700">
                    <CardContent className="p-3 flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Link to={partnerId ? `/profile/${partnerId}` : '#'} className="shrink-0">
                            <Avatar className="w-10 h-10 border-2 border-slate-600">
                              <AvatarImage src={partnerAvatar} alt={partnerName} />
                              <AvatarFallback className="bg-slate-700 text-slate-300">
                                {partnerName.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          </Link>
                          <div>
                            <p className="text-sm font-medium text-slate-200">
                              {giftName} {tx.transaction_type === 'gift_sent' ? 'envoyé(e)' : 'reçu(e)'}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5 flex flex-wrap gap-1 items-center">
                              {tx.transaction_type === 'gift_sent' ? 'À :' : 'De :'} 
                              <Link to={partnerId ? `/profile/${partnerId}` : '#'} className="font-semibold text-slate-300 hover:underline">
                                {partnerName}
                              </Link>
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0 flex items-center gap-1">
                          <img src={coinIcon} alt="" className="w-5 h-5 object-contain" />
                          <span className={`text-sm font-bold ${tx.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {tx.amount > 0 ? '+' : ''}{formatNumber(tx.amount)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-1 ml-12">
                        {videoTitle && (
                          <p className="text-xs text-slate-400 flex items-center gap-1">
                            <span className="font-medium text-slate-300/80">Vidéo :</span>
                            <span className="truncate">{videoTitle}</span>
                          </p>
                        )}
                        <p className="text-[10px] text-slate-500 mt-1">
                          {format(new Date(tx.created_at), 'dd MMM yyyy, HH:mm', { locale: fr })}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              }

              return (
              <Card key={tx.id} className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-3 flex items-center gap-3">
                  <img src={coinIcon} alt="" className="w-10 h-10 object-contain shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">
                      {typeof tx.description === 'string' && tx.description.trim().startsWith('{') ? 'Cadeau' : (tx.description || tx.transaction_type)}
                    </p>
                    <p className="text-xs text-slate-400">
                      {format(new Date(tx.created_at), 'dd MMM yyyy, HH:mm', { locale: fr })}
                    </p>
                  </div>
                  <span className={`text-sm font-bold shrink-0 ${tx.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {tx.amount >= 0 ? '+' : ''}{formatNumber(tx.amount)}
                  </span>
                </CardContent>
              </Card>
            )})}
          </div>
        )}
      </div>

      {/* Dialog de conversion Habbah → SB */}
      <Dialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <img src={coinHabbah} alt="Habbah" className="w-6 h-6 object-contain" />
              Convertir Habbah → Soumboulah Bonus
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-3 justify-center">
              <img src={coinHabbah} alt="Habbah" className="w-10 h-10 object-contain" />
              <RefreshCw size={18} className="text-muted-foreground" />
              <img src={coinSB} alt="Soumboulah Bonus" className="w-10 h-10 object-contain" />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Taux : <strong>100 Habbah = 1 SB</strong>
            </p>
            <p className="text-sm text-center">
              Solde actuel : <strong>{formatNumber(wallet?.habbah || 0)} H.</strong>
            </p>
            <Input
              type="number"
              placeholder="Montant en Habbah (multiple de 100)"
              value={convertAmount}
              onChange={(e) => setConvertAmount(e.target.value)}
              min={100}
              step={100}
            />
            {convertAmount && parseInt(convertAmount) >= 100 && (
              <p className="text-sm text-emerald-600 font-medium text-center">
                Vous recevrez : {formatNumber(Math.floor(parseInt(convertAmount) / 100))} SB
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConvertDialog(false)}>Annuler</Button>
            <Button
              onClick={handleConvert}
              disabled={isConverting || !convertAmount || parseInt(convertAmount) < 100}
            >
              {isConverting ? 'Conversion...' : 'Convertir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WalletScreen;
