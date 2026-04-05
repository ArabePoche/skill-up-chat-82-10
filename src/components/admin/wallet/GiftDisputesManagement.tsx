import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle, 
  XCircle 
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAdminGiftDisputes, useResolveGiftDispute } from '@/wallet/hooks/useGiftDisputes';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const GiftDisputesManagement: React.FC = () => {
  const { data: claims = [], isLoading } = useAdminGiftDisputes();
  const { mutate: resolveDispute, isPending: resolving } = useResolveGiftDispute();

  const [resolveDialog, setResolveDialog] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState('');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge className="bg-yellow-500/20 text-yellow-400">En attente</Badge>;
      case 'approved': return <Badge className="bg-emerald-500/20 text-emerald-400">Remboursé</Badge>;
      case 'rejected': return <Badge className="bg-slate-500/20 text-slate-400">Rejeté / Débloqué</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const handleResolve = (action: 'approve' | 'reject') => {
    if (!resolveDialog) return;
    resolveDispute(
      {
        claimId: resolveDialog.id,
        action,
        adminNotes,
        senderId: resolveDialog.sender_id,
        recipientId: resolveDialog.recipient_id,
        amount: resolveDialog.amount,
        currency: resolveDialog.currency,
      },
      {
        onSuccess: () => {
          setResolveDialog(null);
          setAdminNotes('');
        }
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white flex items-center gap-2">
          <ShieldCheck className="h-8 w-8 text-blue-500" />
          Réclamations d'annulation de cadeaux
        </h1>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Litiges & Réclamations</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-slate-400">Chargement...</div>
          ) : claims.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              Aucune réclamation de cadeau pour le moment.
            </div>
          ) : (
            <div className="space-y-4">
              {claims.map((claim: any) => (
                <div key={claim.id} className="p-4 rounded-xl bg-slate-800/50 border border-slate-700 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">Litige #{claim.id.slice(0, 8)}</span>
                        {getStatusBadge(claim.status)}
                      </div>
                      <p className="text-sm text-slate-400 mt-1">
                        Montant: <span className="font-bold text-emerald-400">{Math.abs(claim.amount).toLocaleString('fr-FR')} {claim.currency === 'soumboulah_cash' ? 'SC' : 'SB'}</span>
                      </p>
                      <p className="text-sm text-slate-400">
                        Date: {format(new Date(claim.created_at), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                      </p>
                    </div>

                    {claim.status === 'pending' && (
                      <Button 
                        size="sm" 
                        onClick={() => setResolveDialog({ ...claim, action: null })}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Traiter
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-4">
                    <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800">
                      <p className="text-slate-400 mb-1">Expéditeur (Plaignant)</p>
                      <div className="flex items-center gap-2">
                        <img 
                          src={claim.sender.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${claim.sender.first_name}`} 
                          alt="Avatar" 
                          className="w-8 h-8 rounded-full bg-slate-700"
                        />
                        <span className="text-slate-200">
                          {claim.sender.first_name} {claim.sender.last_name}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800">
                      <p className="text-slate-400 mb-1">Destinataire (Montant bloqué)</p>
                      <div className="flex items-center gap-2">
                        <img 
                          src={claim.recipient.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${claim.recipient.first_name}`} 
                          alt="Avatar" 
                          className="w-8 h-8 rounded-full bg-slate-700"
                        />
                        <span className="text-slate-200">
                          {claim.recipient.first_name} {claim.recipient.last_name}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-700 mt-2">
                    <p className="text-xs text-slate-500 mb-1">Raison de l'annulation (Expéditeur):</p>
                    <p className="text-sm text-slate-300">{claim.reason}</p>
                  </div>

                  {claim.status !== 'pending' && claim.admin_notes && (
                    <div className="p-3 rounded-lg bg-slate-800 border border-slate-600 mt-2">
                      <p className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                        Décision administrateur ({claim.resolver?.first_name}):
                      </p>
                      <p className="text-sm text-slate-300">{claim.admin_notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog for Resolution */}
      <Dialog open={!!resolveDialog} onOpenChange={() => {
        setResolveDialog(null);
        setAdminNotes('');
      }}>
        <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle>Traiter la réclamation</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700 text-sm">
              <p className="text-slate-300">
                Vous êtes sur le point de rendre une décision pour le cadeau de 
                <span className="font-bold text-emerald-400 mx-1">{resolveDialog?.amount}</span>
                envoyé par <strong>{resolveDialog?.sender?.first_name}</strong> à <strong>{resolveDialog?.recipient?.first_name}</strong>.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Notes de l'administrateur (Obligatoire)</label>
              <Textarea 
                placeholder="Expliquez votre décision (ce message pourra être vu par les utilisateurs si nous l'affichons plus tard)..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="bg-slate-800 border-slate-700 text-slate-200"
              />
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
            <Button 
              variant="outline" 
              className="w-full sm:w-auto bg-transparent border-slate-700 hover:bg-slate-800"
              onClick={() => {
                setResolveDialog(null);
                setAdminNotes('');
              }}
              disabled={resolving}
            >
              Annuler
            </Button>
            
            <div className="flex gap-2 w-full sm:w-auto">
              <Button 
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                onClick={() => handleResolve('reject')}
                disabled={resolving || !adminNotes.trim()}
              >
                <XCircle className="w-4 h-4 mr-1" />
                Rejeter (Débloquer)
              </Button>
              
              <Button 
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => handleResolve('approve')}
                disabled={resolving || !adminNotes.trim()}
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Approuver (Rembourser)
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GiftDisputesManagement;
