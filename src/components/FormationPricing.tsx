import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Phone, MessageCircle, FileText, Clock, DollarSign, Crown, Star, Gift, Users } from 'lucide-react';
import { useFormationPricing } from '@/hooks/useFormationPricing';
import { useUserSubscription } from '@/hooks/useUserSubscription';
import { useAuth } from '@/hooks/useAuth';
import { useEnrollmentWithProtection, useCreatePlanChangeRequest } from '@/hooks/useEnrollments';
import PlanChangeModal from './subscription/PlanChangeModal';

interface FormationPricingProps {
  formationId: string;
  className?: string;
}

const FormationPricing: React.FC<FormationPricingProps> = ({ formationId, className }) => {
  const { pricingOptions, isLoading } = useFormationPricing(formationId);
  const { user } = useAuth();
  const { subscription, createSubscription, isCreating } = useUserSubscription(formationId);
  const { enroll, isFormationPending } = useEnrollmentWithProtection();
  
  // Ajouter le hook pour les changements de plan
  const createPlanChangeRequest = useCreatePlanChangeRequest();
  
  const [planChangeModal, setPlanChangeModal] = useState<{
    isOpen: boolean;
    newPlan: string;
  }>({
    isOpen: false,
    newPlan: ''
  });

  if (isLoading) {
    return (
      <div className={`bg-gradient-to-br from-background via-background to-muted/20 rounded-xl p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-2/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!pricingOptions || pricingOptions.length === 0) {
    return (
      <div className={`bg-gradient-to-br from-background via-background to-muted/20 rounded-xl p-6 text-center ${className}`}>
        <DollarSign size={48} className="mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-xl font-semibold mb-2">Options de tarification</h3>
        <p className="text-muted-foreground">
          Les options de tarification seront bientôt disponibles.
        </p>
      </div>
    );
  }

  const sortedOptions = pricingOptions
    .filter(option => option.is_active)
    .sort((a, b) => {
      const order = { free: 0, standard: 1, premium: 2, groupe: 3 };
      return (order[a.plan_type as keyof typeof order] || 999) - (order[b.plan_type as keyof typeof order] || 999);
    });

  const getPlanIcon = (planType: string) => {
    switch (planType) {
      case 'free': return <Gift className="w-6 h-6 text-green-500" />;
      case 'standard': return <Star className="w-6 h-6 text-blue-500" />;
      case 'premium': return <Crown className="w-6 h-6 text-purple-500" />;
      case 'groupe': return <Users className="w-6 h-6 text-orange-500" />;
      default: return <DollarSign className="w-6 h-6" />;
    }
  };

  const getPlanStyle = (planType: string) => {
    switch (planType) {
      case 'free': 
        return 'border-green-200 bg-green-50 hover:shadow-green-100';
      case 'standard': 
        return 'border-blue-200 bg-blue-50 hover:shadow-blue-100 transform hover:scale-105';
      case 'premium': 
        return 'border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 hover:shadow-purple-100 transform hover:scale-105 ring-2 ring-purple-200';
      case 'groupe': 
        return 'border-orange-200 bg-orange-50 hover:shadow-orange-100 transform hover:scale-105';
      default: 
        return 'border-border bg-background';
    }
  };

  const getButtonStyle = (planType: string) => {
    switch (planType) {
      case 'free': 
        return 'bg-green-500 hover:bg-green-600 text-white';
      case 'standard': 
        return 'bg-blue-500 hover:bg-blue-600 text-white';
      case 'premium': 
        return 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white';
      case 'groupe': 
        return 'bg-orange-500 hover:bg-orange-600 text-white';
      default: 
        return 'bg-primary hover:bg-primary/90 text-primary-foreground';
    }
  };

  const handleSubscribe = async (option: any) => {
    if (!user) {
      return;
    }

    // Éviter les clics multiples
    if (isCreating || isFormationPending(formationId)) {
      return;
    }

    const currentPlan = subscription?.plan_type;
    const newPlan = option.plan_type;

    // Si l'utilisateur a déjà un abonnement et souhaite changer
    if (currentPlan && currentPlan !== newPlan) {
      setPlanChangeModal({
        isOpen: true,
        newPlan: newPlan
      });
      return;
    }

    // Inscription normale pour un nouveau plan
    try {
      await enroll(formationId, user.id, option.plan_type as 'free' | 'standard' | 'premium');
    } catch (error) {
      console.error('Error during subscription:', error);
    }
  };

  const handlePlanChange = async (justification?: string) => {
    if (!user || !subscription) return;

    try {
      // Corriger l'appel en retirant userId
      await createPlanChangeRequest.mutateAsync({
        formationId,
        planType: planChangeModal.newPlan,
        justification
      });
      
      setPlanChangeModal({ isOpen: false, newPlan: '' });
    } catch (error) {
      console.error('Error during plan change:', error);
    }
  };

  const getButtonText = (option: any) => {
    if (!user) return 'Connectez-vous';
    
    const isEnrolling = isCreating || isFormationPending(formationId);
    if (isEnrolling) return 'Inscription...';
    
    const currentPlan = subscription?.plan_type;
    const isCurrentPlan = currentPlan === option.plan_type;
    
    if (isCurrentPlan) return 'Plan actuel';
    if (currentPlan && currentPlan !== option.plan_type) return 'Changer de plan';
    
    return 'S\'inscrire';
  };

  const isButtonDisabled = (option: any) => {
    if (!user) return false;
    
    const isEnrolling = isCreating || isFormationPending(formationId);
    const isCurrentPlan = subscription?.plan_type === option.plan_type;
    
    return isEnrolling || isCurrentPlan;
  };

  const features = [
    { key: 'discussions', label: 'Discussions', icon: MessageCircle },
    { key: 'exercises', label: 'Exercices', icon: FileText },
    { key: 'calls', label: 'Appels vidéo', icon: Phone },
  ];

  return (
    <>
      <div className={`bg-gradient-to-br from-background via-background to-muted/20 rounded-xl p-6 ${className}`} id="pricing">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Choisissez votre formule
          </h2>
          <p className="text-muted-foreground">
            Sélectionnez l'offre qui correspond le mieux à vos besoins
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {sortedOptions.map((option) => {
            const isCurrentPlan = subscription?.plan_type === option.plan_type;
            
            return (
              <div
                key={option.id}
                className={`relative rounded-xl border-2 p-6 transition-all duration-300 hover:shadow-lg ${getPlanStyle(option.plan_type)}`}
              >
                {option.plan_type === 'premium' && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1">
                      Populaire
                    </Badge>
                  </div>
                )}

                {isCurrentPlan && (
                  <div className="absolute -top-3 right-4">
                    <Badge className="bg-green-500 text-white px-3 py-1">
                      Actuel
                    </Badge>
                  </div>
                )}

                <div className="text-center mb-6">
                  <div className="flex justify-center mb-3">
                    {getPlanIcon(option.plan_type)}
                  </div>
                  
                   <h3 className="text-xl font-bold mb-2 capitalize">
                     {option.plan_type === 'free' ? 'Gratuit' : 
                      option.plan_type === 'standard' ? 'Standard' : 
                      option.plan_type === 'premium' ? 'Premium' : 'Groupe'}
                   </h3>

                  <div className="mb-4">
                    {option.price_monthly !== null && option.price_monthly !== undefined ? (
                      <div>
                        <span className="text-3xl font-bold">
                          {option.price_monthly}€
                        </span>
                        <span className="text-muted-foreground">/mois</span>
                      </div>
                    ) : (
                      <div>
                        <span className="text-3xl font-bold text-green-600">Gratuit</span>
                      </div>
                    )}
                    
                    {option.price_yearly && (
                      <p className="text-sm text-muted-foreground mt-1">
                        ou {option.price_yearly}€/an
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  {features.map((feature) => {
                    const hasFeature = feature.key === 'discussions' ? option.allow_discussion :
                                     feature.key === 'exercises' ? option.allow_exercises :
                                     feature.key === 'calls' ? option.allow_calls : false;
                    
                    return (
                      <div key={feature.key} className="flex items-center space-x-3">
                        {hasFeature ? (
                          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                        )}
                        <div className="flex items-center space-x-2">
                          <feature.icon className="w-4 h-4 text-muted-foreground" />
                          <span className={hasFeature ? 'text-foreground' : 'text-muted-foreground line-through'}>
                            {feature.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {option.message_limit_per_day && (
                    <div className="flex items-center space-x-3 text-sm text-muted-foreground">
                      <MessageCircle className="w-4 h-4" />
                      <span>{option.message_limit_per_day} messages/jour</span>
                    </div>
                  )}

                  {option.time_limit_minutes_per_day && (
                    <div className="flex items-center space-x-3 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>{option.time_limit_minutes_per_day}min/jour</span>
                    </div>
                  )}
                </div>

                <Button
                  onClick={() => handleSubscribe(option)}
                  disabled={isButtonDisabled(option)}
                  className={`w-full py-3 font-semibold transition-all duration-200 ${getButtonStyle(option.plan_type)} ${
                    isCurrentPlan ? 'opacity-75 cursor-not-allowed' : ''
                  }`}
                >
                  {getButtonText(option)}
                </Button>

                {option.allowed_call_days && option.allowed_call_days.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border/50">
                    <p className="text-xs text-muted-foreground mb-2">Jours d'appels :</p>
                    <div className="flex flex-wrap gap-1">
                      {option.allowed_call_days.map(day => (
                        <Badge key={day} variant="outline" className="text-xs">
                          {day}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <PlanChangeModal
        isOpen={planChangeModal.isOpen}
        onClose={() => setPlanChangeModal({ isOpen: false, newPlan: '' })}
        onConfirm={handlePlanChange}
        currentPlan={subscription?.plan_type || ''}
        newPlan={planChangeModal.newPlan}
        isLoading={createPlanChangeRequest.isPending}
      />
    </>
  );
};

export default FormationPricing;
