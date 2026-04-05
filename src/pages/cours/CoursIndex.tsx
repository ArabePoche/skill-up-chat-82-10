
/**
 * Page d'accueil des cours - Liste des formations (élève et enseignant)
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ChatInterface from '@/components/ChatInterface';
import CoursHeader from '@/components/cours/CoursHeader';
import FormationSection from '@/components/cours/FormationSection';
import LoadingSpinner from '@/components/cours/LoadingSpinner';
import AvailableFormationsCarousel from '@/components/cours/AvailableFormationsCarousel';
import CreatorFormationModal from '@/components/cours/CreatorFormationModal';
import FormationCard from '@/components/FormationCard';
import { useFormations, useUserEnrollments } from '@/hooks/useFormations';
import { useTeacherFormations } from '@/hooks/useTeacherFormations';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutDashboard, Plus, UserCheck } from 'lucide-react';

const CoursIndex = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  const { data: allFormations, isLoading: formationsLoading } = useFormations();
  const { data: userEnrollments, isLoading: enrollmentsLoading, error: enrollmentsError } = useUserEnrollments(user?.id);
  const { data: teacherFormations, isLoading: teacherFormationsLoading } = useTeacherFormations(user?.id);

  useEffect(() => {
    const testSupabaseConnection = async () => {
      
      
      if (user?.id) {
        
        try {
          const result = await supabase.from('enrollment_requests')
            .select('*')
            .eq('user_id', user.id)
            .limit(1);
          
          
        } catch (err) {
          console.error('Direct Supabase test error:', err);
        }
      }
      
    };

    testSupabaseConnection();
  }, [user, userEnrollments, enrollmentsLoading, enrollmentsError, teacherFormations]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }
  }, [user, loading, navigate]);

  const handleFormationClick = (formation: any) => {
    if (formation.isTeacher) {
      navigate(`/cours/teacher/${formation.id}`);
    } else {
      navigate(`/cours/formation/${formation.id}`);
    }
  };

  if (loading) {
    return (
      <LoadingSpinner 
        message={t('formation.verifyingConnection')} 
        subtitle={t('formation.pleaseWait')} 
      />
    );
  }

  if (!user) {
    return null;
  }

  const isLoading = formationsLoading || enrollmentsLoading || teacherFormationsLoading;

  if (isLoading) {
    return (
      <LoadingSpinner 
        message={t('common.loading')} 
        subtitle={t('formation.loadingFormations')} 
      />
    );
  }

  const studentFormations = userEnrollments?.map(enrollment => {
    const formation = enrollment.formations;
    if (!formation) return null;
    
    return {
      ...formation,
      progress: 0,
      isTeacher: false
    };
  }).filter(Boolean) || [];

  // Filtrer les formations créées par l'utilisateur (inclut actives et inactives)
  const createdFormations = allFormations?.filter(
    formation => formation.author_id === user.id
  ) || [];

  const createdFormationIds = new Set(createdFormations.map(f => f.id));
  const teacherFormationIds = new Set((teacherFormations || []).map((f: any) => f.id));

  const createdFormationSections = {
    active: createdFormations.filter((formation: any) => formation.approval_status === 'approved'),
    pending: createdFormations.filter((formation: any) => formation.approval_status === 'pending'),
    rejected: createdFormations.filter((formation: any) => ['rejected', 'revision_requested'].includes(formation.approval_status)),
    draft: createdFormations.filter((formation: any) => formation.approval_status === 'draft' || !formation.approval_status),
  };

  // Filtrer les formations disponibles (non inscrites, non créées, non enseignées)
  const enrolledFormationIds = new Set(studentFormations.map(f => f.id));
  const availableFormations = allFormations?.filter(
    formation => !enrolledFormationIds.has(formation.id) && 
                 !createdFormationIds.has(formation.id) &&
                 !teacherFormationIds.has(formation.id)
  ) || [];

  const renderCreatedFormations = (formations: any[]) => {
    if (formations.length === 0) {
      return (
        <div className="rounded-xl border bg-white px-4 py-8 text-center text-gray-500">
          Aucune création dans cette catégorie.
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {formations.map((formation) => (
          <FormationCard
            key={`created-${formation.id}`}
            formation={{
              ...formation,
              author: formation.profiles
                ? `${formation.profiles.first_name || ''} ${formation.profiles.last_name || ''}`.trim() || formation.profiles.username || 'Auteur inconnu'
                : 'Auteur inconnu',
              students: formation.students_count || 0,
              rating: formation.rating || 0,
            }}
            isTeacherSection={false}
            onClick={handleFormationClick}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-24">
      <CoursHeader 
        title={t('formation.myFormations')} 
        subtitle={t('formation.continueLearn')} 
        
      />
        
      <div className="p-4 space-y-6">
        <CreatorFormationModal
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
          authorId={user.id}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['formations'] })}
        />
        {/* Mes cours inscrits */}
        {studentFormations.length > 0 && (
          <FormationSection
            title={t('formation.myEnrolledCourses')}
            icon="student"
            formations={studentFormations}
            isTeacherSection={false}
            onFormationClick={handleFormationClick}
            emptyMessage={t('formation.notEnrolled')}
          />
        )}

        {/* Espace enseignant */}
        {teacherFormations && teacherFormations.length > 0 && (
          <FormationSection
            title={t('formation.teacherSpace')}
            icon="teacher"
            formations={teacherFormations}
            isTeacherSection={true}
            onFormationClick={handleFormationClick}
          />
        )}

        {/* Formations disponibles si aucune inscription */}
        {studentFormations.length === 0 && createdFormations.length === 0 && (
          <AvailableFormationsCarousel formations={availableFormations} />
        )}

        {/* Mes créations en dernière section */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <UserCheck size={20} className="text-[#25d366]" />
              <h2 className="text-lg font-semibold sm:text-xl">Mes créations</h2>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 text-sm bg-primary hover:bg-primary/90"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">Créer une formation</span>
                <span className="sm:hidden">Créer</span>
              </Button>

              {createdFormations.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/cours/dashboard')}
                  className="flex items-center gap-2 text-sm"
                >
                  <LayoutDashboard size={16} />
                  <span className="hidden sm:inline">Tableau de bord</span>
                  <span className="sm:hidden">Gérer</span>
                </Button>
              )}
            </div>
          </div>

          {createdFormations.length > 0 ? (
            <Tabs defaultValue="active" className="space-y-4">
              <TabsList className="grid h-auto w-full grid-cols-2 gap-2 md:grid-cols-4">
                <TabsTrigger value="active">Actives ({createdFormationSections.active.length})</TabsTrigger>
                <TabsTrigger value="pending">En attente ({createdFormationSections.pending.length})</TabsTrigger>
                <TabsTrigger value="rejected">Rejetées ({createdFormationSections.rejected.length})</TabsTrigger>
                <TabsTrigger value="draft">Brouillons ({createdFormationSections.draft.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="active" className="mt-0">
                {renderCreatedFormations(createdFormationSections.active)}
              </TabsContent>
              <TabsContent value="pending" className="mt-0">
                {renderCreatedFormations(createdFormationSections.pending)}
              </TabsContent>
              <TabsContent value="rejected" className="mt-0">
                {renderCreatedFormations(createdFormationSections.rejected)}
              </TabsContent>
              <TabsContent value="draft" className="mt-0">
                {renderCreatedFormations(createdFormationSections.draft)}
              </TabsContent>
            </Tabs>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">Vous n'avez pas encore créée de formation.</p>
            </div>
          )}
        </div>
      </div>

      {/* Navbar fixe en bas */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t shadow-lg">
        <Navbar />
      </div>
    </div>
  );
};

export default CoursIndex; 