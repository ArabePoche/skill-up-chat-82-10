import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Users, Plus, X } from 'lucide-react';
import GroupPlanOptions from './GroupPlanOptions';

interface PricingOption {
  id?: string;
  formation_id: string;
  plan_type: 'free' | 'standard' | 'premium' | 'groupe';
  price_monthly?: number;
  price_yearly?: number;
  allow_discussion: boolean;
  allow_exercises: boolean;
  allow_calls: boolean;
  call_type: 'none' | 'audio' | 'video' | 'both';
  allowed_call_days: string[];
  allowed_response_days: string[];
  message_limit_per_day?: number;
  time_limit_minutes_per_day?: number;
  time_limit_minutes_per_week?: number;
  lesson_access: string[];
  is_active: boolean;
  // Nouvelles propriétés pour le plan groupe
  max_students_per_promotion?: number;
  auto_create_promotions?: boolean;
  enable_group_training?: boolean;
  promotion_naming_pattern?: string;
  custom_naming_pattern?: string;
}

interface Lesson {
  id: string;
  title: string;
}

interface Level {
  id: string;
  title: string;
  lessons: Lesson[];
}

interface FormationPricingManagerProps {
  formationId: string;
  lessons: Lesson[];
  levels: Level[];
  onClose?: () => void;
}

const DAYS_OF_WEEK = [
  { value: 'monday', label: 'Lundi' },
  { value: 'tuesday', label: 'Mardi' },
  { value: 'wednesday', label: 'Mercredi' },
  { value: 'thursday', label: 'Jeudi' },
  { value: 'friday', label: 'Vendredi' },
  { value: 'saturday', label: 'Samedi' },
  { value: 'sunday', label: 'Dimanche' }
];

const FormationPricingManager: React.FC<FormationPricingManagerProps> = ({
  formationId,
  lessons,
  levels,
  onClose
}) => {
  const [pricingOptions, setPricingOptions] = useState<PricingOption[]>([]);
  const [loading, setLoading] = useState(false);

  const createDefaultPlan = (planType: 'free' | 'standard' | 'premium' | 'groupe'): PricingOption => {
    const basePlan: PricingOption = {
      formation_id: formationId,
      plan_type: planType,
      allow_discussion: false,
      allow_exercises: false,
      allow_calls: false,
      call_type: 'none',
      allowed_call_days: [],
      allowed_response_days: [],
      lesson_access: [],
      is_active: true
    };

    switch (planType) {
      case 'free':
        return {
          ...basePlan,
          lesson_access: lessons.map(l => l.id).slice(0, 3), // Limiter aux 3 premières leçons
        };
      case 'standard':
        return {
          ...basePlan,
          allow_discussion: true,
          allow_exercises: true,
          allow_calls: true,
          call_type: 'both',
          allowed_call_days: ['tuesday', 'thursday', 'saturday'],
          allowed_response_days: ['tuesday', 'thursday', 'saturday'],
          lesson_access: lessons.map(l => l.id),
        };
      case 'premium':
        return {
          ...basePlan,
          allow_discussion: true,
          allow_exercises: true,
          allow_calls: true,
          call_type: 'both',
          allowed_call_days: DAYS_OF_WEEK.map(d => d.value),
          allowed_response_days: DAYS_OF_WEEK.map(d => d.value),
          lesson_access: lessons.map(l => l.id),
        };
      case 'groupe':
        return {
          ...basePlan,
          allow_discussion: true,
          allow_exercises: true,
          allow_calls: true,
          call_type: 'both',
          allowed_call_days: DAYS_OF_WEEK.map(d => d.value),
          allowed_response_days: DAYS_OF_WEEK.map(d => d.value),
          lesson_access: lessons.map(l => l.id),
          // Options spécifiques au plan groupe
          max_students_per_promotion: 20,
          auto_create_promotions: true,
          enable_group_training: true,
          promotion_naming_pattern: 'formation_number',
          custom_naming_pattern: ''
        };
      default:
        return basePlan;
    }
  };

  const ensureAllPlansExist = (existingOptions: PricingOption[]): PricingOption[] => {
    const requiredPlans: ('free' | 'standard' | 'premium' | 'groupe')[] = ['free', 'standard', 'premium', 'groupe'];
    const result = [...existingOptions];
    
    requiredPlans.forEach(planType => {
      const exists = result.find(option => option.plan_type === planType);
      if (!exists) {
        console.log(`Adding missing plan: ${planType}`);
        result.push(createDefaultPlan(planType));
      }
    });
    
    // Trier dans l'ordre souhaité
    return result.sort((a, b) => {
      const order = { free: 0, standard: 1, premium: 2, groupe: 3 };
      return (order[a.plan_type as keyof typeof order] || 999) - (order[b.plan_type as keyof typeof order] || 999);
    });
  };

  useEffect(() => {
    fetchPricingOptions();
  }, [formationId]);

  const fetchPricingOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('formation_pricing_options')
        .select('*')
        .eq('formation_id', formationId);

      if (error) throw error;

      console.log('Fetched pricing options from DB:', data);
      
      // Toujours s'assurer que tous les plans existent, même si certains ne sont pas en base
      const completeOptions = ensureAllPlansExist(data as PricingOption[] || []);
      console.log('Complete options with all plans:', completeOptions);
      setPricingOptions(completeOptions);
      
    } catch (error) {
      console.error('Error fetching pricing options:', error);
      // En cas d'erreur, créer tous les plans par défaut
      const defaultOptions = ensureAllPlansExist([]);
      setPricingOptions(defaultOptions);
    }
  };

  const updatePricingOption = (index: number, field: keyof PricingOption, value: any) => {
    setPricingOptions(prev => 
      prev.map((option, i) => 
        i === index ? { ...option, [field]: value } : option
      )
    );
  };

  const handleDayToggle = (index: number, field: 'allowed_call_days' | 'allowed_response_days', day: string) => {
    const option = pricingOptions[index];
    const currentDays = option[field] || [];
    const newDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day];
    
    updatePricingOption(index, field, newDays);
  };

  const handleLessonToggle = (index: number, lessonId: string) => {
    const option = pricingOptions[index];
    const currentLessons = option.lesson_access || [];
    const newLessons = currentLessons.includes(lessonId)
      ? currentLessons.filter(id => id !== lessonId)
      : [...currentLessons, lessonId];
    
    updatePricingOption(index, 'lesson_access', newLessons);
  };

  const savePricingOptions = async () => {
    setLoading(true);
    try {
      // Supprimer les anciennes options
      await supabase
        .from('formation_pricing_options')
        .delete()
        .eq('formation_id', formationId);

      // Insérer les nouvelles options
      const dataToInsert = pricingOptions.map(option => {
        const { id, ...optionData } = option;
        return {
          ...optionData,
          formation_id: formationId
        };
      });

      console.log('Saving pricing options with all plans including groupe:', dataToInsert);

      const { error } = await supabase
        .from('formation_pricing_options')
        .insert(dataToInsert);

      if (error) throw error;

      toast.success('Options de tarification sauvegardées avec succès');
      onClose?.();
    } catch (error) {
      console.error('Error saving pricing options:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const getPlanTitle = (planType: string) => {
    switch (planType) {
      case 'free': return 'Offre Gratuite';
      case 'standard': return 'Offre Standard';
      case 'premium': return 'Offre Premium';
      case 'groupe': return 'Offre Groupe';
      default: return planType;
    }
  };

  const getPlanColor = (planType: string) => {
    switch (planType) {
      case 'free': return 'border-green-500';
      case 'standard': return 'border-blue-500';
      case 'premium': return 'border-purple-500';
      case 'groupe': return 'border-orange-500';
      default: return 'border-gray-500';
    }
  };

  console.log('Current pricing options state:', pricingOptions);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Configuration des Tarifs</h2>
        <div className="space-x-2">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={savePricingOptions} disabled={loading}>
            {loading ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {pricingOptions.map((option, index) => (
          <Card key={`${option.plan_type}-${index}`} className={`${getPlanColor(option.plan_type)} border-2`}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {option.plan_type === 'groupe' && <Users className="h-4 w-4" />}
                  {getPlanTitle(option.plan_type)}
                </div>
                <Switch
                  checked={option.is_active}
                  onCheckedChange={(checked) => updatePricingOption(index, 'is_active', checked)}
                />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Prix */}
              <div className="space-y-2">
                <Label>Prix mensuel (FCFA)</Label>
                <Input
                  type="number"
                  min="0"
                  value={option.price_monthly ?? ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    updatePricingOption(index, 'price_monthly', value === '' ? undefined : parseInt(value) || 0);
                  }}
                  placeholder="Ex: 5000 (0 pour gratuit)"
                />
              </div>

              <div className="space-y-2">
                <Label>Prix annuel (FCFA)</Label>
                <Input
                  type="number"
                  min="0"
                  value={option.price_yearly ?? ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    updatePricingOption(index, 'price_yearly', value === '' ? undefined : parseInt(value) || 0);
                  }}
                  placeholder="Ex: 50000 (0 pour gratuit)"
                />
              </div>

              {/* Options spécifiques au plan groupe */}
              {option.plan_type === 'groupe' && (
                <GroupPlanOptions
                  maxStudentsPerPromotion={option.max_students_per_promotion}
                  autoCreatePromotions={option.auto_create_promotions}
                  enableGroupTraining={option.enable_group_training}
                  promotionNamingPattern={option.promotion_naming_pattern}
                  customNamingPattern={option.custom_naming_pattern}
                  formationId={formationId}
                  onMaxStudentsChange={(value) => updatePricingOption(index, 'max_students_per_promotion', value)}
                  onAutoCreateChange={(value) => updatePricingOption(index, 'auto_create_promotions', value)}
                  onEnableGroupChange={(value) => updatePricingOption(index, 'enable_group_training', value)}
                  onNamingPatternChange={(value) => updatePricingOption(index, 'promotion_naming_pattern', value)}
                  onCustomNamingChange={(value) => updatePricingOption(index, 'custom_naming_pattern', value)}
                />
              )}

              {/* Accès */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Accès autorisés</Label>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={option.allow_discussion}
                    onCheckedChange={(checked) => updatePricingOption(index, 'allow_discussion', checked)}
                  />
                  <Label>Discussions</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={option.allow_exercises}
                    onCheckedChange={(checked) => updatePricingOption(index, 'allow_exercises', checked)}
                  />
                  <Label>Exercices</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={option.allow_calls}
                    onCheckedChange={(checked) => updatePricingOption(index, 'allow_calls', checked)}
                  />
                  <Label>Appels</Label>
                </div>
              </div>

              {/* Type d'appel */}
              {option.allow_calls && (
                <div className="space-y-2">
                  <Label>Type d'appel</Label>
                  <Select 
                    value={option.call_type} 
                    onValueChange={(value: any) => updatePricingOption(index, 'call_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun</SelectItem>
                      <SelectItem value="audio">Audio uniquement</SelectItem>
                      <SelectItem value="video">Vidéo uniquement</SelectItem>
                      <SelectItem value="both">Audio et Vidéo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Limites de temps */}
              {option.plan_type === 'free' && (
                <>
                  <div className="space-y-2">
                    <Label>Limite par jour (minutes)</Label>
                    <Input
                      type="number"
                      value={option.time_limit_minutes_per_day || ''}
                      onChange={(e) => updatePricingOption(index, 'time_limit_minutes_per_day', parseInt(e.target.value) || undefined)}
                      placeholder="Ex: 15"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Limite par semaine (minutes)</Label>
                    <Input
                      type="number"
                      value={option.time_limit_minutes_per_week || ''}
                      onChange={(e) => updatePricingOption(index, 'time_limit_minutes_per_week', parseInt(e.target.value) || undefined)}
                      placeholder="Ex: 120mn"
                    />
                  </div>
                </>
              )}

              {/* Limite de messages */}
              {option.allow_discussion && option.plan_type !== 'premium' && option.plan_type !== 'groupe' && (
                <div className="space-y-2">
                  <Label>Messages par jour</Label>
                  <Input
                    type="number"
                    value={option.message_limit_per_day || ''}
                    onChange={(e) => updatePricingOption(index, 'message_limit_per_day', parseInt(e.target.value) || undefined)}
                    placeholder="Ex: 10"
                  />
                </div>
              )}

              {/* Jours d'appels */}
              {option.allow_calls && option.plan_type !== 'premium' && option.plan_type !== 'groupe' && (
                <div className="space-y-2">
                  <Label>Jours d'appels autorisés</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {DAYS_OF_WEEK.map(day => (
                      <div key={day.value} className="flex items-center space-x-2">
                        <Checkbox
                          checked={(option.allowed_call_days || []).includes(day.value)}
                          onCheckedChange={() => handleDayToggle(index, 'allowed_call_days', day.value)}
                        />
                        <Label className="text-sm">{day.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Jours de réponse prof */}
              {option.allow_discussion && option.plan_type !== 'premium' && option.plan_type !== 'groupe' && (
                <div className="space-y-2">
                  <Label>Jours de réponse prof</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {DAYS_OF_WEEK.map(day => (
                      <div key={day.value} className="flex items-center space-x-2">
                        <Checkbox
                          checked={(option.allowed_response_days || []).includes(day.value)}
                          onCheckedChange={() => handleDayToggle(index, 'allowed_response_days', day.value)}
                        />
                        <Label className="text-sm">{day.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Leçons accessibles par niveau - seulement pour le plan gratuit */}
              {option.plan_type === 'free' && (
                <div className="space-y-4">
                  <Label>Leçons accessibles par niveau</Label>
                  <div className="max-h-96 overflow-y-auto space-y-4">
                    {levels.map(level => (
                      <div key={level.id} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-sm">{level.title}</h4>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const levelLessonIds = level.lessons.map(l => l.id);
                              const currentAccess = option.lesson_access || [];
                              const hasAllLevelLessons = levelLessonIds.every(id => currentAccess.includes(id));
                              
                              if (hasAllLevelLessons) {
                                // Désélectionner toutes les leçons du niveau
                                const newAccess = currentAccess.filter(id => !levelLessonIds.includes(id));
                                updatePricingOption(index, 'lesson_access', newAccess);
                              } else {
                                // Sélectionner toutes les leçons du niveau
                                const newAccess = [...new Set([...currentAccess, ...levelLessonIds])];
                                updatePricingOption(index, 'lesson_access', newAccess);
                              }
                            }}
                            className="h-6 text-xs"
                          >
                            {(() => {
                              const levelLessonIds = level.lessons.map(l => l.id);
                              const currentAccess = option.lesson_access || [];
                              const hasAllLevelLessons = levelLessonIds.every(id => currentAccess.includes(id));
                              return hasAllLevelLessons ? 'Tout décocher' : 'Tout cocher';
                            })()}
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {level.lessons.map(lesson => (
                            <div key={lesson.id} className="flex items-center space-x-2">
                              <Checkbox
                                checked={(option.lesson_access || []).includes(lesson.id)}
                                onCheckedChange={() => handleLessonToggle(index, lesson.id)}
                              />
                              <Label className="text-sm">{lesson.title}</Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Note spéciale pour les plans premium et groupe */}
              {(option.plan_type === 'premium' || option.plan_type === 'groupe') && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>{option.plan_type === 'premium' ? 'Plan Premium' : 'Plan Groupe'} :</strong> Accès illimité à toutes les fonctionnalités
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default FormationPricingManager;
