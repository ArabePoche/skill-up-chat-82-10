/**
 * Interface admin pour configurer le système monétaire (Habbah, SB, SC)
 * Onglets : Conversion, Règles de gain, Limites globales, Anti-fraude
 */
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useCurrencySettings } from '@/hooks/admin/useCurrencySettings';
import { RefreshCw, Save, Coins, Shield, TrendingUp, Settings2, Percent } from 'lucide-react';

const CurrencySettingsManagement: React.FC = () => {
  const {
    conversion, earningRules, globalLimits, antifraud, commissionSettings,
    isLoading, updateConversion, updateEarningRule, updateGlobalLimits, updateAntifraud, updateCommissionRate, isSaving,
  } = useCurrencySettings();

  const [convForm, setConvForm] = useState({ habbah_per_sb: 100, max_conversions_per_day: 1, max_conversions_per_month: 5, conversion_delay_hours: 0, is_conversion_enabled: true, sc_to_fcfa_rate: 1 });
  const [limitsForm, setLimitsForm] = useState({ max_habbah_per_day: 200, max_habbah_per_month: 3000, min_trust_score: 0, max_sb_percentage_for_digital: 30, is_sb_enabled_for_digital: true });
  const [fraudForm, setFraudForm] = useState({ suspicious_threshold_per_hour: 50, auto_block_enabled: true, pending_validation_enabled: false, pending_validation_delay_hours: 24 });

  useEffect(() => {
    if (conversion) setConvForm({ habbah_per_sb: conversion.habbah_per_sb, max_conversions_per_day: conversion.max_conversions_per_day, max_conversions_per_month: conversion.max_conversions_per_month, conversion_delay_hours: conversion.conversion_delay_hours, is_conversion_enabled: conversion.is_conversion_enabled, sc_to_fcfa_rate: conversion.sc_to_fcfa_rate || 1 });
  }, [conversion]);

  useEffect(() => {
    if (globalLimits) setLimitsForm({ max_habbah_per_day: globalLimits.max_habbah_per_day, max_habbah_per_month: globalLimits.max_habbah_per_month, min_trust_score: globalLimits.min_trust_score, max_sb_percentage_for_digital: globalLimits.max_sb_percentage_for_digital, is_sb_enabled_for_digital: globalLimits.is_sb_enabled_for_digital });
  }, [globalLimits]);

  useEffect(() => {
    if (antifraud) setFraudForm({ suspicious_threshold_per_hour: antifraud.suspicious_threshold_per_hour, auto_block_enabled: antifraud.auto_block_enabled, pending_validation_enabled: antifraud.pending_validation_enabled, pending_validation_delay_hours: antifraud.pending_validation_delay_hours });
  }, [antifraud]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Chargement...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Gestion Monnaie Virtuelle</h2>
        <p className="text-muted-foreground">Configurez les règles du système Habbah & Soumboulah</p>
      </div>

      <Tabs defaultValue="conversion" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="conversion" className="flex items-center gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Conversion</span>
          </TabsTrigger>
          <TabsTrigger value="earning" className="flex items-center gap-1.5">
            <Coins className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Gains</span>
          </TabsTrigger>
          <TabsTrigger value="limits" className="flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Limites</span>
          </TabsTrigger>
          <TabsTrigger value="antifraud" className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Anti-fraude</span>
          </TabsTrigger>
          <TabsTrigger value="commission" className="flex items-center gap-1.5">
            <Percent className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Commissions</span>
          </TabsTrigger>
        </TabsList>

        {/* Onglet Conversion */}
        <TabsContent value="conversion">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><RefreshCw className="h-5 w-5" /> Paramètres de conversion</CardTitle>
              <CardDescription>Taux et limites pour la conversion Habbah → Soumboulah Bonus</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Habbah nécessaires pour 1 SB</Label>
                  <Input type="number" value={convForm.habbah_per_sb} onChange={e => setConvForm(p => ({ ...p, habbah_per_sb: parseInt(e.target.value) || 0 }))} />
                </div>
                <div className="space-y-2">
                  <Label>Conversions max / jour</Label>
                  <Input type="number" value={convForm.max_conversions_per_day} onChange={e => setConvForm(p => ({ ...p, max_conversions_per_day: parseInt(e.target.value) || 0 }))} />
                </div>
                <div className="space-y-2">
                  <Label>Conversions max / mois</Label>
                  <Input type="number" value={convForm.max_conversions_per_month} onChange={e => setConvForm(p => ({ ...p, max_conversions_per_month: parseInt(e.target.value) || 0 }))} />
                </div>
                <div className="space-y-2">
                  <Label>Délai de validation (heures)</Label>
                  <Input type="number" value={convForm.conversion_delay_hours} onChange={e => setConvForm(p => ({ ...p, conversion_delay_hours: parseInt(e.target.value) || 0 }))} />
                  <p className="text-xs text-muted-foreground">0 = instantané</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <Switch checked={convForm.is_conversion_enabled} onCheckedChange={v => setConvForm(p => ({ ...p, is_conversion_enabled: v }))} />
                  <Label>Conversion activée</Label>
                </div>
                <Button onClick={() => updateConversion(convForm)} disabled={isSaving}>
                  <Save className="h-4 w-4 mr-2" /> Enregistrer
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Règles de gain */}
        <TabsContent value="earning">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Coins className="h-5 w-5" /> Règles de gain Habbah</CardTitle>
              <CardDescription>Actions générant des Habbah et leurs limites</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Habbah</TableHead>
                    <TableHead>Limite/jour</TableHead>
                    <TableHead>Limite/mois</TableHead>
                    <TableHead>Cooldown (s)</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {earningRules.map(rule => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-medium">{rule.action_label}</TableCell>
                      <TableCell>
                        <Input type="number" className="w-20" defaultValue={rule.habbah_amount}
                          onBlur={e => { const v = parseInt(e.target.value); if (v !== rule.habbah_amount) updateEarningRule({ id: rule.id, habbah_amount: v }); }} />
                      </TableCell>
                      <TableCell>
                        <Input type="number" className="w-20" defaultValue={rule.daily_limit}
                          onBlur={e => { const v = parseInt(e.target.value); if (v !== rule.daily_limit) updateEarningRule({ id: rule.id, daily_limit: v }); }} />
                      </TableCell>
                      <TableCell>
                        <Input type="number" className="w-20" defaultValue={rule.monthly_limit}
                          onBlur={e => { const v = parseInt(e.target.value); if (v !== rule.monthly_limit) updateEarningRule({ id: rule.id, monthly_limit: v }); }} />
                      </TableCell>
                      <TableCell>
                        <Input type="number" className="w-20" defaultValue={rule.cooldown_seconds}
                          onBlur={e => { const v = parseInt(e.target.value); if (v !== rule.cooldown_seconds) updateEarningRule({ id: rule.id, cooldown_seconds: v }); }} />
                      </TableCell>
                      <TableCell>
                        <Switch checked={rule.is_active}
                          onCheckedChange={v => updateEarningRule({ id: rule.id, is_active: v })} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Limites globales */}
        <TabsContent value="limits">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" /> Limites globales</CardTitle>
              <CardDescription>Plafonds anti-inflation et règles d'utilisation SB</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Max Habbah / jour / utilisateur</Label>
                  <Input type="number" value={limitsForm.max_habbah_per_day} onChange={e => setLimitsForm(p => ({ ...p, max_habbah_per_day: parseInt(e.target.value) || 0 }))} />
                </div>
                <div className="space-y-2">
                  <Label>Max Habbah / mois / utilisateur</Label>
                  <Input type="number" value={limitsForm.max_habbah_per_month} onChange={e => setLimitsForm(p => ({ ...p, max_habbah_per_month: parseInt(e.target.value) || 0 }))} />
                </div>
                <div className="space-y-2">
                  <Label>Score de confiance minimum</Label>
                  <Input type="number" value={limitsForm.min_trust_score} onChange={e => setLimitsForm(p => ({ ...p, min_trust_score: parseInt(e.target.value) || 0 }))} />
                  <p className="text-xs text-muted-foreground">0 = pas de restriction</p>
                </div>
                <div className="space-y-2">
                  <Label>% max SB pour produits numériques</Label>
                  <Input type="number" value={limitsForm.max_sb_percentage_for_digital} onChange={e => setLimitsForm(p => ({ ...p, max_sb_percentage_for_digital: parseInt(e.target.value) || 0 }))} />
                  <p className="text-xs text-muted-foreground">Ex: 30 = max 30% payable en SB</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <Switch checked={limitsForm.is_sb_enabled_for_digital} onCheckedChange={v => setLimitsForm(p => ({ ...p, is_sb_enabled_for_digital: v }))} />
                  <Label>SB utilisable pour produits numériques</Label>
                </div>
                <Button onClick={() => updateGlobalLimits(limitsForm)} disabled={isSaving}>
                  <Save className="h-4 w-4 mr-2" /> Enregistrer
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Anti-fraude */}
        <TabsContent value="antifraud">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Paramètres anti-fraude</CardTitle>
              <CardDescription>Détection et prévention des abus</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Seuil actions suspectes / heure</Label>
                  <Input type="number" value={fraudForm.suspicious_threshold_per_hour} onChange={e => setFraudForm(p => ({ ...p, suspicious_threshold_per_hour: parseInt(e.target.value) || 0 }))} />
                </div>
                <div className="space-y-2">
                  <Label>Délai validation différée (heures)</Label>
                  <Input type="number" value={fraudForm.pending_validation_delay_hours} onChange={e => setFraudForm(p => ({ ...p, pending_validation_delay_hours: parseInt(e.target.value) || 0 }))} />
                </div>
              </div>
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2">
                  <Switch checked={fraudForm.auto_block_enabled} onCheckedChange={v => setFraudForm(p => ({ ...p, auto_block_enabled: v }))} />
                  <Label>Blocage automatique si seuil dépassé</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={fraudForm.pending_validation_enabled} onCheckedChange={v => setFraudForm(p => ({ ...p, pending_validation_enabled: v }))} />
                  <Label>Validation différée des gains</Label>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button onClick={() => updateAntifraud(fraudForm)} disabled={isSaving}>
                  <Save className="h-4 w-4 mr-2" /> Enregistrer
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Commissions sur cadeaux */}
        <TabsContent value="commission">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Percent className="h-5 w-5" /> Commission sur les cadeaux reçus</CardTitle>
              <CardDescription>
                Pourcentage prélevé par la plateforme sur chaque cadeau reçu, selon le niveau de l'utilisateur.
                S'applique aux trois monnaies : Soumboulah Cash, Soumboulah Bonus et Habbah.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Badge</TableHead>
                    <TableHead>Niveau</TableHead>
                    <TableHead>Commission (%)</TableHead>
                    <TableHead>Montant reçu (%)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commissionSettings.map(setting => (
                    <TableRow key={setting.id}>
                      <TableCell className="text-xl">{setting.level_badge}</TableCell>
                      <TableCell className="font-medium">{setting.level_name}</TableCell>
                      <TableCell>
                        <Input
                          key={`${setting.id}-${setting.commission_rate}`}
                          type="number"
                          className="w-24"
                          min={0}
                          max={100}
                          defaultValue={Math.round(setting.commission_rate * 100)}
                          onBlur={e => {
                            const pct = parseFloat(e.target.value);
                            if (!isNaN(pct)) {
                              const rate = Math.min(1, Math.max(0, pct / 100));
                              if (rate !== setting.commission_rate) {
                                updateCommissionRate({ id: setting.id, commission_rate: rate });
                              }
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {Math.round((1 - setting.commission_rate) * 100)} %
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CurrencySettingsManagement;
