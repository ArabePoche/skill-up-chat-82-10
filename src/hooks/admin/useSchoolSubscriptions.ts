import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SubscriptionPlan {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number | null;
  currency: string;
  is_active: boolean;
  sort_order: number;
}

export interface SubscriptionFeature {
  feature_key: string;
  label: string;
  description: string | null;
  category: string;
  sort_order: number;
}

export interface PlanFeature {
  plan_id: string;
  feature_key: string;
  enabled: boolean;
}

export function useSchoolSubscriptions() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [features, setFeatures] = useState<SubscriptionFeature[]>([]);
  const [planFeatures, setPlanFeatures] = useState<PlanFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [plansRes, featuresRes, planFeaturesRes] = await Promise.all([
        supabase.from('school_subscription_plans').select('*').order('sort_order', { ascending: true }),
        supabase.from('school_subscription_features').select('*').order('sort_order', { ascending: true }),
        supabase.from('school_plan_features').select('*')
      ]);

      if (plansRes.error) throw plansRes.error;
      if (featuresRes.error) throw featuresRes.error;
      if (planFeaturesRes.error) throw planFeaturesRes.error;

      setPlans(plansRes.data as SubscriptionPlan[]);
      setFeatures(featuresRes.data as SubscriptionFeature[]);
      setPlanFeatures(planFeaturesRes.data as PlanFeature[]);
    } catch (error: any) {
      console.error('Error fetching school subscriptions:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données d'abonnement.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const updatePlan = async (planId: string, updates: Partial<SubscriptionPlan>) => {
    try {
      const { error } = await supabase
        .from('school_subscription_plans')
        .update(updates)
        .eq('id', planId);

      if (error) throw error;
      
      setPlans(plans.map(p => p.id === planId ? { ...p, ...updates } : p));
      
      toast({
        title: "Succès",
        description: "Plan mis à jour avec succès.",
      });
      return true;
    } catch (error: any) {
      console.error('Error updating plan:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le plan.",
        variant: "destructive"
      });
      return false;
    }
  };

  const toggleFeature = async (planId: string, featureKey: string, newValue: boolean) => {
    try {
      const existing = planFeatures.find(pf => pf.plan_id === planId && pf.feature_key === featureKey);
      
      if (existing) {
        const { error } = await supabase
          .from('school_plan_features')
          .update({ enabled: newValue })
          .eq('plan_id', planId)
          .eq('feature_key', featureKey);

        if (error) throw error;
        
        setPlanFeatures(planFeatures.map(pf => 
          (pf.plan_id === planId && pf.feature_key === featureKey) 
            ? { ...pf, enabled: newValue } 
            : pf
        ));
      } else {
        const { error } = await supabase
          .from('school_plan_features')
          .insert([{ plan_id: planId, feature_key: featureKey, enabled: newValue }]);

        if (error) throw error;
        
        setPlanFeatures([...planFeatures, { plan_id: planId, feature_key: featureKey, enabled: newValue }]);
      }
      
      toast({
        title: "Succès",
        description: "Fonctionnalité mise à jour avec succès.",
      });
      return true;
    } catch (error: any) {
      console.error('Error toggling feature:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour la fonctionnalité.",
        variant: "destructive"
      });
      return false;
    }
  };

  return {
    plans,
    features,
    planFeatures,
    loading,
    refreshData: fetchData,
    updatePlan,
    toggleFeature
  };
}
