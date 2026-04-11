/**
 * Gestion de l'approbation des formations (Admin Dashboard)
 * Permet aux admins d'approuver, refuser ou demander des rectifications
 */
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { CheckCircle, XCircle, MessageSquare, Clock, Loader2, ToggleLeft, ToggleRight } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import FormationCommissionSettings from './FormationCommissionSettings';
import { notifyFormationPreRegistrants } from '@/utils/notifyFormationPreRegistrants';

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'En attente', variant: 'outline' },
  approved: { label: 'Approuvée', variant: 'default' },
  rejected: { label: 'Refusée', variant: 'destructive' },
  revision_requested: { label: 'Rectifications', variant: 'secondary' },
  draft: { label: 'Brouillon', variant: 'secondary' },
};

const FormationApprovalManagement = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [actionModal, setActionModal] = useState<{ formation: any; action: string } | null>(null);
  const [reason, setReason] = useState('');

  const { data: formations, isLoading } = useQuery({
    queryKey: ['formations-approval'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('formations')
        .select(`*, profiles:author_id (first_name, last_name, username)`)
        .order('submitted_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status, rejectionReason }: { id: string; status: string; rejectionReason?: string }) => {
      const update: any = {
        approval_status: status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user?.id,
      };
      if (status === 'approved') {
        update.is_active = true;
      }
      if (rejectionReason) {
        update.rejection_reason = rejectionReason;
      }
      const { error } = await supabase
        .from('formations')
        .update(update)
        .eq('id', id);
      if (error) throw error;
      return { id, activated: status === 'approved' };
    },
    onSuccess: async ({ id, activated }) => {
      queryClient.invalidateQueries({ queryKey: ['formations-approval'] });
      queryClient.invalidateQueries({ queryKey: ['formations-list'] });
      if (activated) {
        try {
          const { notifiedCount } = await notifyFormationPreRegistrants(id);
          toast.success(
            notifiedCount > 0
              ? `Statut mis à jour et ${notifiedCount} pré-inscrit(s) notifié(s)`
              : 'Statut de la formation mis à jour'
          );
        } catch (notificationError) {
          console.error('Error notifying pre-registrants:', notificationError);
          toast.success('Statut de la formation mis à jour');
          toast.error('La formation a été activée, mais la notification des pré-inscrits a échoué.');
        }
      } else {
        toast.success('Statut de la formation mis à jour');
      }
      setActionModal(null);
      setReason('');
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('formations')
        .update({ is_active: isActive })
        .eq('id', id);
      if (error) throw error;
      return { id, isActive };
    },
    onSuccess: async ({ id, isActive }) => {
      queryClient.invalidateQueries({ queryKey: ['formations-approval'] });
      queryClient.invalidateQueries({ queryKey: ['formations-list'] });
      if (isActive) {
        try {
          const { notifiedCount } = await notifyFormationPreRegistrants(id);
          toast.success(
            notifiedCount > 0
              ? `Formation activée et ${notifiedCount} pré-inscrit(s) notifié(s)`
              : 'Formation activée'
          );
        } catch (notificationError) {
          console.error('Error notifying pre-registrants:', notificationError);
          toast.success('Formation activée');
          toast.error('La notification des pré-inscrits a échoué.');
        }
      } else {
        toast.success('Formation désactivée');
      }
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  const handleAction = () => {
    if (!actionModal) return;
    const { formation, action } = actionModal;
    if ((action === 'rejected' || action === 'revision_requested') && !reason.trim()) {
      toast.error('Veuillez indiquer un motif');
      return;
    }
    updateMutation.mutate({
      id: formation.id,
      status: action,
      rejectionReason: reason.trim() || undefined,
    });
  };

  const pendingCount = formations?.filter((f: any) => f.approval_status === 'pending').length || 0;

  return (
    <div className="space-y-6">
      <FormationCommissionSettings />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Approbation des formations
            {pendingCount > 0 && (
              <Badge variant="destructive" className="ml-2">{pendingCount} en attente</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Chargement...</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Formation</TableHead>
                    <TableHead>Créateur</TableHead>
                    <TableHead>Prix</TableHead>
                    <TableHead>Soumise le</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Actif</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {formations?.map((f: any) => {
                    const sc = statusConfig[f.approval_status] || statusConfig.pending;
                    return (
                      <TableRow key={f.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{f.title || 'Sans titre'}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">{f.description}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {f.profiles ? `${f.profiles.first_name || ''} ${f.profiles.last_name || ''}`.trim() || f.profiles.username : '—'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {f.price ? `${f.price.toLocaleString('fr-FR')} FCFA` : 'Gratuit'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {f.submitted_at ? format(new Date(f.submitted_at), 'dd MMM yyyy', { locale: fr }) : '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={sc.variant}>{sc.label}</Badge>
                          {f.rejection_reason && (
                            <p className="text-xs text-red-500 mt-1 max-w-[150px] truncate" title={f.rejection_reason}>
                              {f.rejection_reason}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            className={f.is_active ? 'text-green-600' : 'text-gray-400'}
                            onClick={() => toggleActiveMutation.mutate({ id: f.id, isActive: !f.is_active })}
                            disabled={toggleActiveMutation.isPending}
                            title={f.is_active ? 'Désactiver' : 'Activer'}
                          >
                            {f.is_active ? (
                              <ToggleRight className="h-5 w-5" />
                            ) : (
                              <ToggleLeft className="h-5 w-5" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {f.approval_status !== 'approved' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600"
                                onClick={() => updateMutation.mutate({ id: f.id, status: 'approved' })}
                                title="Approuver"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600"
                              onClick={() => setActionModal({ formation: f, action: 'rejected' })}
                              title="Refuser"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-amber-600"
                              onClick={() => setActionModal({ formation: f, action: 'revision_requested' })}
                              title="Demander rectifications"
                            >
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {(!formations || formations.length === 0) && (
                <p className="text-center py-8 text-muted-foreground">Aucune formation soumise</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal pour motif de refus/rectification */}
      <Dialog open={!!actionModal} onOpenChange={() => { setActionModal(null); setReason(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionModal?.action === 'rejected' ? 'Motif du refus' : 'Demande de rectifications'}
            </DialogTitle>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Indiquez le motif ou les modifications demandées..."
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setActionModal(null); setReason(''); }}>Annuler</Button>
            <Button
              onClick={handleAction}
              disabled={updateMutation.isPending || !reason.trim()}
              variant={actionModal?.action === 'rejected' ? 'destructive' : 'default'}
            >
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FormationApprovalManagement;
