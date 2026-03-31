// Panneau admin pour gérer les cagnottes solidaires + config des commissions
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  useSolidarityCampaigns,
  useSolidaritySettings,
  useUpdateSolidaritySettings,
  useAdminCampaignAction,
  SolidarityCampaign,
} from '../hooks/useSolidarityCampaigns';
import { Heart, CheckCircle, XCircle, Clock, Settings2, Save, Percent } from 'lucide-react';
import coinSC from '@/assets/coin-soumboulah-cash.png';

const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n);

const statusBadge = (status: string) => {
  switch (status) {
    case 'pending': return <Badge variant="outline" className="border-amber-500 text-amber-600"><Clock size={12} className="mr-1" /> En attente</Badge>;
    case 'approved': return <Badge variant="outline" className="border-green-500 text-green-600"><CheckCircle size={12} className="mr-1" /> Approuvée</Badge>;
    case 'rejected': return <Badge variant="outline" className="border-red-500 text-red-600"><XCircle size={12} className="mr-1" /> Rejetée</Badge>;
    case 'completed': return <Badge variant="outline" className="border-blue-500 text-blue-600"><CheckCircle size={12} className="mr-1" /> Terminée</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
};

const AdminSolidarityManagement: React.FC = () => {
  const { data: allCampaigns = [], isLoading } = useSolidarityCampaigns();
  const { data: settings } = useSolidaritySettings();
  const { mutate: updateSettings, isPending: savingSettings } = useUpdateSolidaritySettings();
  const { mutate: campaignAction, isPending: actionPending } = useAdminCampaignAction();

  // Settings form
  const [commissionRate, setCommissionRate] = useState(5);
  const [minGoal, setMinGoal] = useState(1000);
  const [maxGoal, setMaxGoal] = useState(10000000);
  const [maxActive, setMaxActive] = useState(3);

  // Approve dialog
  const [approveTarget, setApproveTarget] = useState<SolidarityCampaign | null>(null);
  const [approveCommission, setApproveCommission] = useState(5);

  // Reject dialog
  const [rejectTarget, setRejectTarget] = useState<SolidarityCampaign | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    if (settings) {
      setCommissionRate(settings.default_commission_rate);
      setMinGoal(settings.min_campaign_goal);
      setMaxGoal(settings.max_campaign_goal);
      setMaxActive(settings.max_active_campaigns_per_user);
    }
  }, [settings]);

  const handleSaveSettings = () => {
    updateSettings({
      default_commission_rate: commissionRate,
      min_campaign_goal: minGoal,
      max_campaign_goal: maxGoal,
      max_active_campaigns_per_user: maxActive,
    });
  };

  const pendingCampaigns = allCampaigns.filter(c => c.status === 'pending');
  const activeCampaigns = allCampaigns.filter(c => c.status === 'approved' || c.status === 'completed');
  const rejectedCampaigns = allCampaigns.filter(c => c.status === 'rejected');

  const handleOpenApprove = (c: SolidarityCampaign) => {
    setApproveTarget(c);
    setApproveCommission(c.commission_rate ?? settings?.default_commission_rate ?? 5);
  };

  const handleApprove = () => {
    if (!approveTarget) return;
    campaignAction({ campaignId: approveTarget.id, action: 'approved', commissionRate: approveCommission });
    setApproveTarget(null);
  };

  const handleReject = () => {
    if (!rejectTarget) return;
    campaignAction({ campaignId: rejectTarget.id, action: 'rejected', rejectionReason: rejectReason });
    setRejectTarget(null);
    setRejectReason('');
  };

  const renderCampaignRow = (c: SolidarityCampaign, showActions = false) => (
    <Card key={c.id} className="mb-3">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {c.image_url && (
              <img src={c.image_url} alt={c.title} className="w-full h-28 object-cover rounded-md mb-2" />
            )}
            <h4 className="font-semibold text-sm truncate">{c.title}</h4>
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{c.description}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <img src={coinSC} alt="" className="w-4 h-4" />
                {fmt(c.collected_amount)} / {fmt(c.goal_amount)} SC
              </span>
              <span>Commission: {c.commission_rate}%</span>
              {statusBadge(c.status)}
            </div>
            {c.creator && (
              <p className="text-xs text-muted-foreground mt-1">
                Par {c.creator.first_name} {c.creator.last_name}
              </p>
            )}
          </div>
          {showActions && c.status === 'pending' && (
            <div className="flex flex-col gap-2 shrink-0">
              <Button
                size="sm"
                onClick={() => handleOpenApprove(c)}
                disabled={actionPending}
                className="bg-green-600 hover:bg-green-700 text-white text-xs"
              >
                <CheckCircle size={14} /> Approuver
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setRejectTarget(c)}
                disabled={actionPending}
                className="text-red-600 border-red-300 text-xs"
              >
                <XCircle size={14} /> Rejeter
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Heart className="text-rose-500" size={24} />
        <h2 className="text-2xl font-bold">Aide Solidaire</h2>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            En attente ({pendingCampaigns.length})
          </TabsTrigger>
          <TabsTrigger value="active">Actives ({activeCampaigns.length})</TabsTrigger>
          <TabsTrigger value="rejected">Rejetées ({rejectedCampaigns.length})</TabsTrigger>
          <TabsTrigger value="settings">
            <Settings2 size={14} className="mr-1" /> Configuration
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          {isLoading ? (
            <p className="text-muted-foreground text-sm text-center py-8">Chargement...</p>
          ) : pendingCampaigns.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">Aucune cagnotte en attente</p>
          ) : (
            pendingCampaigns.map(c => renderCampaignRow(c, true))
          )}
        </TabsContent>

        <TabsContent value="active" className="mt-4">
          {activeCampaigns.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">Aucune cagnotte active</p>
          ) : (
            activeCampaigns.map(c => renderCampaignRow(c))
          )}
        </TabsContent>

        <TabsContent value="rejected" className="mt-4">
          {rejectedCampaigns.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">Aucune cagnotte rejetée</p>
          ) : (
            rejectedCampaigns.map(c => renderCampaignRow(c))
          )}
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Percent size={18} /> Configuration des commissions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Commission par défaut (%)</Label>
                  <Input type="number" value={commissionRate} onChange={e => setCommissionRate(Number(e.target.value))} min={0} max={50} />
                </div>
                <div>
                  <Label>Max cagnottes actives / user</Label>
                  <Input type="number" value={maxActive} onChange={e => setMaxActive(Number(e.target.value))} min={1} />
                </div>
                <div>
                  <Label>Objectif minimum (SC)</Label>
                  <Input type="number" value={minGoal} onChange={e => setMinGoal(Number(e.target.value))} min={100} />
                </div>
                <div>
                  <Label>Objectif maximum (SC)</Label>
                  <Input type="number" value={maxGoal} onChange={e => setMaxGoal(Number(e.target.value))} min={1000} />
                </div>
              </div>
              <Button onClick={handleSaveSettings} disabled={savingSettings}>
                <Save size={16} className="mr-1" />
                {savingSettings ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog d'approbation avec commission modifiable */}
      <Dialog open={!!approveTarget} onOpenChange={open => { if (!open) setApproveTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Approuver la cagnotte</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {approveTarget && (
              <p className="text-sm text-muted-foreground">
                <strong>{approveTarget.title}</strong>
                {approveTarget.creator && (
                  <span> — {approveTarget.creator.first_name} {approveTarget.creator.last_name}</span>
                )}
              </p>
            )}
            <div>
              <Label>Commission appliquée (%)</Label>
              <Input
                type="number"
                value={approveCommission}
                onChange={e => setApproveCommission(Number(e.target.value))}
                min={0}
                max={50}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Taux par défaut : {settings?.default_commission_rate ?? 5}%
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveTarget(null)}>Annuler</Button>
            <Button
              onClick={handleApprove}
              disabled={actionPending}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle size={14} className="mr-1" /> Confirmer l'approbation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de rejet */}
      <Dialog open={!!rejectTarget} onOpenChange={open => { if (!open) setRejectTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rejeter la cagnotte</DialogTitle>
          </DialogHeader>
          <div>
            <Label>Raison du rejet</Label>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-2"
              placeholder="Expliquez pourquoi la cagnotte est rejetée..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>Annuler</Button>
            <Button variant="destructive" onClick={handleReject} disabled={actionPending}>
              Rejeter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSolidarityManagement;
