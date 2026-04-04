import React, { useState } from 'react';
import { useSchoolSubscriptions, SubscriptionPlan } from '@/hooks/admin/useSchoolSubscriptions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Save } from 'lucide-react';
import { Label } from '@/components/ui/label';

export default function SchoolSubscriptionsManagement() {
  const { plans, features, planFeatures, loading, updatePlan, toggleFeature } = useSchoolSubscriptions();
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [editMonthlyPrice, setEditMonthlyPrice] = useState<number>(0);
  const [editYearlyPrice, setEditYearlyPrice] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleEditPlan = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setEditMonthlyPrice(plan.price_monthly);
    setEditYearlyPrice(plan.price_yearly || 0);
  };

  const handleSavePlan = async () => {
    if (!editingPlan) return;
    
    setIsSaving(true);
    const success = await updatePlan(editingPlan.id, {
      price_monthly: editMonthlyPrice,
      price_yearly: editYearlyPrice
    });
    
    if (success) {
      setEditingPlan(null);
    }
    setIsSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Gestion des Abonnements Écoles</h2>
      </div>

      <Tabs defaultValue="plans" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="plans">Tarifs et Plans</TabsTrigger>
          <TabsTrigger value="features">Matrice des Fonctionnalités</TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Plans d'Abonnement</CardTitle>
              <CardDescription>
                Configurez les prix de chaque formule d'abonnement proposée aux écoles.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.map(plan => (
                  <Card key={plan.id} className={editingPlan?.id === plan.id ? "border-primary" : ""}>
                    <CardHeader>
                      <CardTitle>{plan.name}</CardTitle>
                      <CardDescription>{plan.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {editingPlan?.id === plan.id ? (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor={`monthly-${plan.id}`}>Prix Mensuel ({plan.currency})</Label>
                            <Input 
                              id={`monthly-${plan.id}`}
                              type="number" 
                              value={editMonthlyPrice} 
                              onChange={(e) => setEditMonthlyPrice(Number(e.target.value))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`yearly-${plan.id}`}>Prix Annuel ({plan.currency})</Label>
                            <Input 
                              id={`yearly-${plan.id}`}
                              type="number" 
                              value={editYearlyPrice} 
                              onChange={(e) => setEditYearlyPrice(Number(e.target.value))}
                            />
                          </div>
                          <div className="flex space-x-2 pt-2">
                            <Button 
                              onClick={handleSavePlan} 
                              disabled={isSaving}
                              className="w-full"
                            >
                              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                              Enregistrer
                            </Button>
                            <Button 
                              variant="outline" 
                              onClick={() => setEditingPlan(null)}
                              disabled={isSaving}
                            >
                              Annuler
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="flex justify-between py-2 border-b">
                            <span className="text-muted-foreground">Mensuel</span>
                            <span className="font-semibold">{plan.price_monthly.toLocaleString()} {plan.currency}</span>
                          </div>
                          <div className="flex justify-between py-2 mb-4">
                            <span className="text-muted-foreground">Annuel</span>
                            <span className="font-semibold">{plan.price_yearly?.toLocaleString() || '0'} {plan.currency}</span>
                          </div>
                          <Button variant="outline" className="w-full" onClick={() => handleEditPlan(plan)}>
                            Modifier les prix
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features">
          <Card>
            <CardHeader>
              <CardTitle>Périmètre Fonctionnel</CardTitle>
              <CardDescription>
                Activez ou désactivez les fonctionnalités pour chaque plan d'abonnement.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">Fonctionnalité</TableHead>
                    {plans.map(plan => (
                      <TableHead key={plan.id} className="text-center">{plan.name}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {features.map(feature => (
                    <TableRow key={feature.feature_key}>
                      <TableCell>
                        <div className="font-medium">{feature.label}</div>
                        {feature.description && (
                          <div className="text-sm text-muted-foreground">{feature.description}</div>
                        )}
                      </TableCell>
                      {plans.map(plan => {
                        const isEnabled = planFeatures.some(
                          pf => pf.plan_id === plan.id && pf.feature_key === feature.feature_key && pf.enabled
                        );
                        return (
                          <TableCell key={`${plan.id}-${feature.feature_key}`} className="text-center">
                            <Switch 
                              checked={isEnabled}
                              onCheckedChange={(checked) => toggleFeature(plan.id, feature.feature_key, checked)}
                            />
                          </TableCell>
                        );
                      })}
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
}
