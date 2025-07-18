
/**
 * Page d'accueil des cours - Liste des formations (élève et enseignant)
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ChatInterface from '@/components/ChatInterface';
import CoursHeader from '@/components/cours/CoursHeader';
import FormationSection from '@/components/cours/FormationSection';
import LoadingSpinner from '@/components/cours/LoadingSpinner';
import { useFormations, useUserEnrollments } from '@/hooks/useFormations';
import { useTeacherFormations } from '@/hooks/useTeacherFormations';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const CoursIndex = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  
  const { data: allFormations, isLoading: formationsLoading } = useFormations();
  const { data: userEnrollments, isLoading: enrollmentsLoading, error: enrollmentsError } = useUserEnrollments(user?.id);
  const { data: teacherFormations, isLoading: teacherFormationsLoading } = useTeacherFormations(user?.id);

  useEffect(() => {
    const testSupabaseConnection = async () => {
      console.log('=== DEBUG COURS PAGE ===');
      console.log('User:', user);
      console.log('User ID:', user?.id);
      console.log('User enrollments loading:', enrollmentsLoading);
      console.log('User enrollments data:', userEnrollments);
      console.log('User enrollments error:', enrollmentsError);
      console.log('Teacher formations:', teacherFormations);
      
      if (user?.id) {
        console.log('Testing Supabase connection...');
        try {
          const result = await supabase.from('enrollment_requests')
            .select('*')
            .eq('user_id', user.id)
            .limit(1);
          
          console.log('Direct Supabase test result:', result);
        } catch (err) {
          console.error('Direct Supabase test error:', err);
        }
      }
      console.log('========================');
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
        message="Vérification de la connexion..." 
        subtitle="Veuillez patienter" 
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
        message="Chargement..." 
        subtitle="Récupération de vos formations" 
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

  console.log('Student formations processed:', studentFormations);

  const debugMessage = `User ID: ${user?.id} | Enrollments: ${userEnrollments?.length || 0} | Error: ${enrollmentsError ? 'YES - ' + enrollmentsError.message : 'NO'} | Loading: ${enrollmentsLoading}`;

  return (
    <div className="bg-gray-50 min-h-screen pb-24">
      <CoursHeader 
        title="Mes Formations" 
        subtitle="Continuez votre apprentissage" 
        
      />
        
      <div className="p-4 space-y-6">
        <FormationSection
          title="Mes cours suivis"
          icon="student"
          formations={studentFormations}
          isTeacherSection={false}
          onFormationClick={handleFormationClick}
          emptyMessage="Vous n'êtes inscrit à aucune formation"
          debugInfo={debugMessage}
        />

        {teacherFormations && teacherFormations.length > 0 && (
          <FormationSection
            title="Espace enseignant"
            icon="teacher"
            formations={teacherFormations}
            isTeacherSection={true}
            onFormationClick={handleFormationClick}
          />
        )}
      </div>
    </div>
  );
};

export default CoursIndex;
