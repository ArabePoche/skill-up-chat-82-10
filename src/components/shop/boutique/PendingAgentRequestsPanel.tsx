/**
 * Panneau affiché au propriétaire de la boutique
 * pour gérer les demandes d'accès agent en attente.
 */
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Check, X, UserCheck, Clock, Loader2 } from 'lucide-react';
import {
  usePendingAgentRequests,
  useApproveAgentRequest,
  useRejectAgentRequest,
} from '@/hooks/shop/useShopAgentRequests';

const ROLE_OPTIONS = [
  { value: 'PDG', label: 'PDG' },
  { value: 'vendeur', label: 'Vendeur' },
  { value: 'comptable', label: 'Comptable' },
  { value: 'gardien', label: 'Gardien' },
  { value: 'caissier', label: 'Caissier' },
  { value: 'magasinier', label: 'Magasinier' },
  { value: 'livreur', label: 'Livreur' },
];

interface PendingAgentRequestsPanelProps {
  shopId: string;
}

const PendingAgentRequestsPanel: React.FC<PendingAgentRequestsPanelProps> = ({ shopId }) => {
  const { data: requests, isLoading } = usePendingAgentRequests(shopId);
  const approveRequest = useApproveAgentRequest();
  const rejectRequest = useRejectAgentRequest();
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>({});

  if (isLoading || !requests || requests.length === 0) return null;

  const handleApprove = async (agentId: string) => {
    const role = selectedRoles[agentId];
    if (!role) return;
    await approveRequest.mutateAsync({ agentId, shopId, role });
  };

  return (
    <Card className="border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock size={18} className="text-orange-500" />
          Demandes d'accès en attente
          <Badge variant="secondary" className="ml-auto bg-orange-100 text-orange-700">
            {requests.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {requests.map((request) => (
          <div
            key={request.id}
            className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-background rounded-lg border"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">
                {request.first_name} {request.last_name}
              </p>
              <p className="text-xs text-muted-foreground">
                Souhaite être : <span className="font-medium text-foreground">{request.requested_role}</span>
              </p>
              {request.email && (
                <p className="text-xs text-muted-foreground">{request.email}</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Select
                value={selectedRoles[request.id] || request.requested_role || ''}
                onValueChange={(val) =>
                  setSelectedRoles((prev) => ({ ...prev, [request.id]: val }))
                }
              >
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue placeholder="Rôle" />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                size="sm"
                variant="default"
                className="h-8 px-3"
                disabled={!selectedRoles[request.id] && !request.requested_role || approveRequest.isPending}
                onClick={() => handleApprove(request.id)}
              >
                {approveRequest.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Check size={14} />
                )}
              </Button>

              <Button
                size="sm"
                variant="destructive"
                className="h-8 px-3"
                disabled={rejectRequest.isPending}
                onClick={() => rejectRequest.mutate({ agentId: request.id, shopId })}
              >
                {rejectRequest.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <X size={14} />
                )}
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default PendingAgentRequestsPanel;
