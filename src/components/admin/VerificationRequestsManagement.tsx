import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle } from 'lucide-react';
import { useVerificationRequests } from '@/hooks/useVerification';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

/**
 * Composant de gestion des demandes de certification
 * Permet aux admins d'approuver ou rejeter les demandes
 */
const VerificationRequestsManagement = () => {
  const { requests, isLoading, approveRequest, rejectRequest, isProcessing } = useVerificationRequests();
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const handleApprove = (requestId: string, userId: string) => {
    if (confirm('Êtes-vous sûr de vouloir certifier ce compte ?')) {
      approveRequest({ requestId, userId });
    }
  };

  const handleRejectClick = (request: any) => {
    setSelectedRequest(request);
    setShowRejectDialog(true);
  };

  const handleRejectConfirm = () => {
    if (selectedRequest) {
      rejectRequest({ requestId: selectedRequest.id, reason: rejectionReason });
      setShowRejectDialog(false);
      setRejectionReason('');
      setSelectedRequest(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            Chargement des demandes de certification...
          </div>
        </CardContent>
      </Card>
    );
  }

  const pendingRequests = requests?.filter(r => r.status === 'pending') || [];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Demandes de certification</CardTitle>
          <p className="text-sm text-muted-foreground">
            Gérez les demandes de certification EducaTok Verified
          </p>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucune demande de certification en attente
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Nom d'utilisateur</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Date de demande</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">
                      {`${request.profiles?.first_name || ''} ${request.profiles?.last_name || ''}`.trim() || 'N/A'}
                    </TableCell>
                    <TableCell>@{request.profiles?.username || 'N/A'}</TableCell>
                    <TableCell>{request.profiles?.email || 'N/A'}</TableCell>
                    <TableCell>
                      {new Date(request.requested_at).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                        En attente
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleApprove(request.id, request.user_id)}
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          disabled={isProcessing}
                        >
                          <CheckCircle size={14} className="mr-1" />
                          Approuver
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRejectClick(request)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          disabled={isProcessing}
                        >
                          <XCircle size={14} className="mr-1" />
                          Rejeter
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog de rejet */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeter la demande de certification</DialogTitle>
            <DialogDescription>
              Vous êtes sur le point de rejeter la demande de certification de{' '}
              {selectedRequest?.profiles?.first_name} {selectedRequest?.profiles?.last_name}.
              Vous pouvez optionnellement fournir une raison.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Raison du rejet (optionnel)"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={isProcessing}
            >
              Rejeter la demande
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default VerificationRequestsManagement;
