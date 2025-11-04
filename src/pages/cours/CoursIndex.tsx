
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
import { useFormations, useUserEnrollments } from '@/hooks/useFormations';
import { useTeacherFormations } from '@/hooks/useTeacherFormations';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import { useTranslation } from 'react-i18next';

const CoursIndex = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
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

  // Filtrer les formations disponibles (non inscrites)
  const enrolledFormationIds = new Set(studentFormations.map(f => f.id));
  const availableFormations = allFormations?.filter(
    formation => !enrolledFormationIds.has(formation.id)
  ) || [];

  

  return (
    <div className="bg-gray-50 min-h-screen pb-24">
      <CoursHeader 
        title={t('formation.myFormations')} 
        subtitle={t('formation.continueLearn')} 
        
      />
        
      <div className="p-4 space-y-6">
        {studentFormations.length === 0 ? (
          <AvailableFormationsCarousel formations={availableFormations} />
        ) : (
          <FormationSection
            title={t('formation.myEnrolledCourses')}
            icon="student"
            formations={studentFormations}
            isTeacherSection={false}
            onFormationClick={handleFormationClick}
            emptyMessage={t('formation.notEnrolled')}
          />
        )}

        {teacherFormations && teacherFormations.length > 0 && (
          <FormationSection
            title={t('formation.teacherSpace')}
            icon="teacher"
            formations={teacherFormations}
            isTeacherSection={true}
            onFormationClick={handleFormationClick}
          />
        )}
      </div>

      {/* Navbar fixe en bas */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t shadow-lg">
        <Navbar />
      </div>
    </div>
  );
};

export default CoursIndex; 