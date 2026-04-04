/**
 * Gestion des taux de commission formations (Admin Dashboard)
 * Permet de modifier dynamiquement les taux catalogue, canal créateur, boost
 */
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Save, Percent, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const FormationCommissionSettings = () => {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['formation-commission-settings-admin'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('formation_commission_settings')
        .select('*')
        .order('commission_rate', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, commission_rate, is_active }: { id: string; commission_rate: number; is_active: boolean }) => {
      const { error } = await (supabase as any)
        .from('formation_commission_settings')
        .update({ commission_rate, is_active, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['formation-commission-settings-admin'] });
      toast.success('Taux de commission mis à jour');
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  if (isLoading) return <div className="py-8 text-center text-muted-foreground">Chargement...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Percent className="h-5 w-5" />
          Commissions Formations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {settings?.map((setting: any) => (
          <CommissionRow
            key={setting.id}
            setting={setting}
            onSave={(rate, active) => updateMutation.mutate({ id: setting.id, commission_rate: rate, is_active: active })}
            saving={updateMutation.isPending}
          />
        ))}
      </CardContent>
    </Card>
  );
};

const CommissionRow = ({ setting, onSave, saving }: { setting: any; onSave: (rate: number, active: boolean) => void; saving: boolean }) => {
  const [rate, setRate] = useState(setting.commission_rate);
  const [active, setActive] = useState(setting.is_active);
  const changed = rate !== setting.commission_rate || active !== setting.is_active;

  return (
    <div className="border rounded-lg p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-sm">{setting.commission_label}</p>
          <p className="text-xs text-muted-foreground">{setting.commission_description}</p>
        </div>
        <Badge variant={active ? 'default' : 'secondary'}>{active ? 'Actif' : 'Inactif'}</Badge>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 flex-1">
          <Label className="text-xs whitespace-nowrap">Taux (%)</Label>
          <Input
            type="number"
            min="0"
            max="100"
            step="0.5"
            value={rate}
            onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
            className="w-24"
          />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs">Actif</Label>
          <Switch checked={active} onCheckedChange={setActive} />
        </div>
        {changed && (
          <Button size="sm" onClick={() => onSave(rate, active)} disabled={saving}>
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          </Button>
        )}
      </div>
    </div>
  );
};

export default FormationCommissionSettings;
