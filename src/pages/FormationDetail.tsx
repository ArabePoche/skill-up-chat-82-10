import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Star, Users, Clock, BookOpen, Award, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEnrollmentWithProtection } from '@/hooks/useEnrollments';
import FormationPricing from '@/components/FormationPricing';
import { toast } from 'sonner';

const FormationDetail = () => {
  const { formationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { enroll, isFormationPending } = useEnrollmentWithProtection();

  const { data: formation, isLoading } = useQuery({
    queryKey: ['formation-detail', formationId],
    queryFn: async () => {
      if (!formationId) throw new Error('Formation ID is required');
      
      const { data, error } = await supabase
        .from('formations')
        .select(`
          *,
          profiles:author_id (
            first_name,
            last_name,
            username
          ),
          levels (
            id,
            title,
            description,
            order_index,
            lessons (
              id,
              title,
              description,
              duration,
              order_index
            )
          )
        `)
        .eq('id', formationId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!formationId
  });

  const handleEnroll = async () => {
    if (!user) {
      toast.error('Veuillez vous connecter pour vous inscrire');
      navigate('/auth');
      return;
    }

    if (!formationId) return;

    if (isFormationPending(formationId)) {
      toast.error('Inscription déjà en cours...');
      return;
    }

    try {
      await enroll(formationId, user.id);
    } catch (error) {
      console.error('Enrollment failed:', error);
    }
  };

  const formatAuthorName = (profile: any) => {
    if (!profile) return 'Auteur inconnu';
    const firstName = profile.first_name || '';
    const lastName = profile.last_name || '';
    return `${firstName} ${lastName}`.trim() || profile.username || 'Auteur inconnu';
  };

  const totalLessons = formation?.levels?.reduce((total, level) => total + (level.lessons?.length || 0), 0) || 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-16 md:pt-16 md:pb-0 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-edu-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de la formation...</p>
        </div>
      </div>
    );
  }

  if (!formation) {
    return (
      <div className="min-h-screen bg-gray-50 pb-16 md:pt-16 md:pb-0 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Formation non trouvée</h1>
          <Button onClick={() => navigate('/shop')}>Retour au shop</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16 md:pt-16 md:pb-0">
      {/* Header */}
      <div className="bg-white border-b fixed top-0 left-0 right-0 z-50  shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/shop')}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft size={20} />
            </Button>
            <h1 className="text-xl font-semibold text-gray-900 truncate">Détails de la formation</h1>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-8">
        {/* Formation Hero */}
        <Card className="overflow-hidden">
          <div className="relative">
            <div className="h-64 bg-gradient-to-br from-edu-primary/10 to-edu-secondary/10 flex items-center justify-center">
              {formation.image_url || formation.thumbnail_url ? (
                <img 
                  src={formation.image_url || formation.thumbnail_url} 
                  alt={formation.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-gray-400">Image de formation</span>
              )}
            </div>
            {formation.badge && (
              <Badge className="absolute top-4 right-4 bg-edu-primary text-white">
                {formation.badge}
              </Badge>
            )}
          </div>
          
          <CardContent className="p-6">
            <div className="space-y-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{formation.title}</h1>
                <p className="text-gray-600">
                  Par {formatAuthorName(formation.profiles)}
                </p>
              </div>

              {formation.description && (
                <p className="text-gray-700 leading-relaxed">{formation.description}</p>
              )}

              {/* Stats */}
              <div className="flex flex-wrap items-center gap-6 pt-4 border-t">
                <div className="flex items-center space-x-1">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={16}
                        className={`${
                          i < Math.floor(formation.rating || 0)
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="font-medium">{formation.rating || 0}</span>
                  <span className="text-gray-500">({formation.students_count || 0})</span>
                </div>

                <div className="flex items-center space-x-2 text-gray-600">
                  <Users size={16} />
                  <span>{formation.students_count || 0} étudiants</span>
                </div>

                <div className="flex items-center space-x-2 text-gray-600">
                  <BookOpen size={16} />
                  <span>{totalLessons} leçons</span>
                </div>

                {formation.duration && (
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Clock size={16} />
                    <span>{formation.duration}h</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Course Content */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BookOpen size={20} />
              <span>Contenu de la formation</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {formation.levels?.sort((a, b) => a.order_index - b.order_index).map((level) => (
              <div key={level.id} className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-2">{level.title}</h3>
                {level.description && (
                  <p className="text-gray-600 mb-3">{level.description}</p>
                )}
                {level.lessons && level.lessons.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">
                      {level.lessons.length} leçon(s)
                    </p>
                    <div className="space-y-1">
                      {level.lessons
                        .sort((a, b) => a.order_index - b.order_index)
                        .slice(0, 3)
                        .map((lesson) => (
                          <div key={lesson.id} className="flex items-center space-x-2 text-sm text-gray-600">
                            <div className="w-1.5 h-1.5 bg-edu-primary rounded-full"></div>
                            <span>{lesson.title}</span>
                            {lesson.duration && (
                              <span className="text-gray-400">({lesson.duration})</span>
                            )}
                          </div>
                        ))}
                      {level.lessons.length > 3 && (
                        <p className="text-sm text-gray-500 italic">
                          ... et {level.lessons.length - 3} autres leçons
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Section Pricing dédiée */}
        <div className="space-y-4">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Plans d'abonnement</h2>
            <p className="text-gray-600">Choisissez l'offre qui correspond à vos besoins</p>
          </div>
          
          <FormationPricing formationId={formationId || ''} />
        </div>

        {/* Quick Actions */}
        <div className="flex justify-center">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 text-center space-y-4">
              <h3 className="text-lg font-semibold">Inscription rapide</h3>
              <Button 
                className="w-full bg-edu-primary hover:bg-edu-primary/90"
                onClick={handleEnroll}
                disabled={!user || isFormationPending(formationId || '')}
                size="lg"
              >
                {!user ? 'Connectez-vous pour vous inscrire' : 
                 isFormationPending(formationId || '') ? 'Inscription en cours...' : 
                 'S\'inscrire maintenant (Plan Gratuit)'}
              </Button>

              {!user && (
                <p className="text-xs text-gray-500">
                  Vous devez être connecté pour vous inscrire à cette formation
                </p>
              )}
              
              <div className="pt-4 border-t space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Niveaux:</span>
                  <span className="font-medium">{formation.levels?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Leçons:</span>
                  <span className="font-medium">{totalLessons}</span>
                </div>
                <div className="flex justify-between">
                  <span>Étudiants:</span>
                  <span className="font-medium">{formation.students_count || 0}</span>
                </div>
                {formation.duration && (
                  <div className="flex justify-between">
                    <span>Durée:</span>
                    <span className="font-medium">{formation.duration}h</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default FormationDetail;
