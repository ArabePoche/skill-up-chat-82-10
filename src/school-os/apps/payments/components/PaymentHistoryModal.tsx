// Modal affichant l'historique des paiements d'un élève avec actions
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useStudentPayments, useDeletePayment } from '../hooks/usePayments';
import { Edit2, Trash2, Calendar, DollarSign, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { EditPaymentDialog } from './EditPaymentDialog';

interface PaymentHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName: string;
}

export const PaymentHistoryModal: React.FC<PaymentHistoryModalProps> = ({
  open,
  onOpenChange,
  studentId,
  studentName,
}) => {
  const { data: payments = [], isLoading } = useStudentPayments(studentId);
  const deletePayment = useDeletePayment();
  const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null);
  const [editingPayment, setEditingPayment] = useState<any>(null);

  const handleDelete = async () => {
    if (paymentToDelete) {
      await deletePayment.mutateAsync(paymentToDelete);
      setPaymentToDelete(null);
    }
  };

  const getPaymentTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      monthly: 'Mensuel',
      quarterly: 'Trimestriel',
      annual: 'Annuel',
      registration: 'Inscription',
      other: 'Autre',
    };
    return types[type] || type;
  };

  const getPaymentMethodLabel = (method: string) => {
    const methods: Record<string, string> = {
      cash: 'Espèces',
      check: 'Chèque',
      bank_transfer: 'Virement',
      mobile_money: 'Mobile Money',
      card: 'Carte bancaire',
    };
    return methods[method] || method;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Historique des paiements</DialogTitle>
            <DialogDescription>
              Paiements de {studentName}
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucun paiement enregistré pour cet élève.
            </div>
          ) : (
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-3">
                {payments.map((payment: any) => (
                  <div
                    key={payment.id}
                    className="border rounded-lg p-4 space-y-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline">
                            {getPaymentTypeLabel(payment.payment_type)}
                          </Badge>
                          <Badge variant="secondary">
                            {getPaymentMethodLabel(payment.payment_method)}
                          </Badge>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <DollarSign className="w-4 h-4 text-muted-foreground" />
                            <span className="font-semibold text-lg text-green-600">
                              {payment.amount.toLocaleString('fr-FR')} FCFA
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            <span>
                              {new Date(payment.payment_date).toLocaleDateString('fr-FR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </span>
                          </div>

                          {payment.reference_number && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <FileText className="w-4 h-4" />
                              <span>Réf: {payment.reference_number}</span>
                            </div>
                          )}

                          {payment.notes && (
                            <p className="text-sm text-muted-foreground mt-2 p-2 bg-muted/50 rounded">
                              {payment.notes}
                            </p>
                          )}

                          {payment.received_by_profile && (
                             <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border">
                               <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                                 {payment.received_by_profile.avatar_url ? (
                                   <img 
                                     src={payment.received_by_profile.avatar_url} 
                                     alt={payment.received_by_profile.full_name || payment.received_by_profile.first_name || ''} 
                                     className="w-full h-full object-cover"
                                   />
                                 ) : (
                                   <span className="text-sm font-semibold text-primary">
                                     {(payment.received_by_profile.first_name?.[0] || payment.received_by_profile.full_name?.[0] || 'U').toUpperCase()}
                                   </span>
                                 )}
                               </div>
                               <div className="flex-1 min-w-0">
                                 <p className="text-xs text-muted-foreground mb-0.5">Reçu par</p>
                                 <p className="text-sm font-medium truncate">
                                   {payment.received_by_profile.full_name || 
                                    `${payment.received_by_profile.first_name || ''} ${payment.received_by_profile.last_name || ''}`.trim()}
                                 </p>
                               </div>
                             </div>
                           )}

                          {payment.updated_by_profile && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>Modifié par:</span>
                              <span className="font-medium">
                                {payment.updated_by_profile.full_name || 
                                 `${payment.updated_by_profile.first_name || ''} ${payment.updated_by_profile.last_name || ''}`.trim()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-1 ml-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingPayment(payment)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPaymentToDelete(payment.id)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation de suppression */}
      <AlertDialog open={!!paymentToDelete} onOpenChange={() => setPaymentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce paiement ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le paiement sera supprimé et le progrès de
              paiement sera recalculé automatiquement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog d'édition */}
      {editingPayment && (
        <EditPaymentDialog
          open={!!editingPayment}
          onOpenChange={(open) => !open && setEditingPayment(null)}
          payment={editingPayment}
        />
      )}
    </>
  );
};
