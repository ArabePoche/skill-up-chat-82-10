// Écran principal du portefeuille multi-devises Habbah & Soumboulah
import React, { useState } from 'react';
import { ArrowLeft, RefreshCw, ShoppingBag, BookOpen, Gift, Heart, ArrowDownUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUserWallet } from '@/hooks/useUserWallet';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate, Link } from 'react-router-dom';

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

const WalletScreen: React.FC = () => {
  const navigate = useNavigate();
  const { wallet, isLoading, transactions, convertHabbah, isConverting } = useUserWallet();
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
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-background dark:from-emerald-950/20 dark:to-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-700 to-emerald-900 text-white px-4 pt-12 pb-6">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="p-1">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-xl font-bold" style={{ fontFamily: "'Georgia', serif" }}>
              Habbah & Soumboulah
            </h1>
            <p className="text-emerald-200 text-sm">Mon Portefeuille (My Wallet)</p>
          </div>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          {/* Soumboulah Cash */}
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-2xl p-4 shadow-lg">
            <p className="text-emerald-200 text-xs font-semibold uppercase tracking-wide">
              Solde Soumboulah (Cash)
            </p>
            <p className="text-3xl font-bold mt-1">
              {formatNumber(wallet?.soumboulah_cash || 0)} <span className="text-lg">S.</span>
            </p>
            <p className="text-emerald-300 text-xs mt-1">
              ≈ {formatNumber((wallet?.soumboulah_cash || 0) * 10)} FCFA
            </p>
            <Button
              size="sm"
              variant="secondary"
              className="mt-2 bg-white/20 hover:bg-white/30 text-white border-0 text-xs"
            >
              Recharger
            </Button>
          </div>

          {/* Habbah */}
          <div className="bg-gradient-to-br from-amber-500 to-amber-700 rounded-2xl p-4 shadow-lg">
            <p className="text-amber-100 text-xs font-semibold uppercase tracking-wide">
              Solde Habbah (Récompenses)
            </p>
            <p className="text-3xl font-bold mt-1">
              {formatNumber(wallet?.habbah || 0)} <span className="text-lg">H.</span>
            </p>
            <Button
              size="sm"
              variant="secondary"
              className="mt-2 bg-white/20 hover:bg-white/30 text-white border-0 text-xs"
              onClick={() => setShowConvertDialog(true)}
            >
              Convertir en Bonus S.
            </Button>
          </div>
        </div>

        {/* Soumboulah Bonus bar */}
        <div className="bg-white/10 backdrop-blur rounded-xl p-3 mt-3 flex items-center justify-between">
          <div>
            <p className="text-emerald-200 text-xs">Soumboulah Bonus</p>
            <p className="text-lg font-bold">{formatNumber(wallet?.soumboulah_bonus || 0)} SB</p>
          </div>
          <span className="text-emerald-300 text-xs bg-white/10 px-2 py-1 rounded-full">
            Cours & Abonnements
          </span>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="px-4 py-5">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Actions Rapides
        </h2>
        <div className="grid grid-cols-4 gap-3">
          {[
            { icon: ShoppingBag, label: 'Shopping', color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
            { icon: BookOpen, label: "S'abonner\nCours", color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' },
            { icon: Gift, label: 'Offrir\nCadeaux', color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' },
            { icon: Heart, label: 'Aides\nSolidaires', color: 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400' },
          ].map((action, i) => (
            <button key={i} className="flex flex-col items-center gap-1.5">
              <div className={`w-12 h-12 rounded-full ${action.color} flex items-center justify-center`}>
                <action.icon size={22} />
              </div>
              <span className="text-xs text-center font-medium text-foreground whitespace-pre-line leading-tight">
                {action.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Dernières transactions */}
      <div className="px-4 pb-24">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Dernières Transactions
        </h2>
        {transactions.filter(tx => tx.transaction_type !== 'commission').length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground text-sm">
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

              if (isGift && metadata && (metadata.partner_name || metadata.receiver_name || metadata.sender_name || metadata.gift_name || metadata.gift_reason)) {
                const partnerName = metadata.partner_name || metadata.receiver_name || metadata.sender_name || 'Utilisateur';
                const partnerAvatar = metadata.partner_avatar || metadata.receiver_avatar || metadata.sender_avatar;
                
                // If there's no explicit gift name, but we have a gift_reason, it might be the video title.
                const explicitGiftName = metadata.gift_name || metadata.giftName;
                const rawVideoTitle = metadata.video_title || metadata.post_title;
                
                let giftName = explicitGiftName;
                let videoTitle = rawVideoTitle;

                if (!explicitGiftName) {
                   if (rawVideoTitle) {
                       giftName = 'Cadeau vidéo';
                   } else if (metadata.gift_reason && metadata.gift_reason !== 'gift') {
                       // the reason is actually the video title
                       videoTitle = metadata.gift_reason;
                       giftName = 'Cadeau vidéo';
                   } else {
                       giftName = 'Cadeau';
                   }
                }

                // Also if giftName is exactly the videoTitle, correct it:
                if (giftName && videoTitle && giftName === videoTitle) {
                    giftName = 'Cadeau vidéo';
                }

                const partnerId = metadata.partner_id || metadata.receiver_id || metadata.sender_id;
                
                return (
                  <Card key={tx.id}>
                    <CardContent className="p-3 flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Link to={partnerId ? `/profile/${partnerId}` : '#'} className="shrink-0">
                            <Avatar className="w-10 h-10 border-2 border-emerald-100 dark:border-emerald-900">
                              <AvatarImage src={partnerAvatar} alt={partnerName} />
                              <AvatarFallback className="bg-emerald-100 text-emerald-700">
                                {partnerName.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          </Link>
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {giftName} {tx.transaction_type === 'gift_sent' ? 'envoyé(e)' : 'reçu(e)'}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-1 items-center">
                              {tx.transaction_type === 'gift_sent' ? 'À :' : 'De :'} 
                              <Link to={partnerId ? `/profile/${partnerId}` : '#'} className="font-semibold text-foreground hover:underline">
                                {partnerName}
                              </Link>
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`text-sm font-bold block ${tx.amount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {tx.amount > 0 ? '+' : ''}{formatNumber(tx.amount)} {currencySymbol[tx.currency] || ''}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-1 ml-12">
                        {videoTitle && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <span className="font-medium text-foreground/80">Vidéo :</span>
                            <span className="truncate">{videoTitle}</span>
                          </p>
                        )}
                        <p className="text-[10px] text-muted-foreground opacity-80 mt-1">
                          {format(new Date(tx.created_at), 'dd MMM yyyy, HH:mm', { locale: fr })}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              }

              return (
              <Card key={tx.id}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center ${
                    tx.amount >= 0
                      ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    <ArrowDownUp size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {typeof tx.description === 'string' && tx.description.trim().startsWith('{') ? 'Cadeau' : (tx.description || tx.transaction_type)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(tx.created_at), 'dd MMM yyyy, HH:mm', { locale: fr })}
                    </p>
                  </div>
                  <span className={`text-sm font-bold shrink-0 ${tx.amount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {tx.amount >= 0 ? '+' : ''}{formatNumber(tx.amount)} {currencySymbol[tx.currency] || ''}
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
              <RefreshCw size={18} />
              Convertir Habbah → Soumboulah Bonus
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Taux : <strong>100 Habbah = 1 SB</strong>
            </p>
            <p className="text-sm">
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
              <p className="text-sm text-emerald-600 font-medium">
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
