import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ChatInterface from '@/components/ChatInterface';
import TeacherView from '@/components/TeacherView';
import CoursHeader from '@/components/cours/CoursHeader';
import FormationSection from '@/components/cours/FormationSection';
import FormationDetail from '@/components/cours/FormationDetail';
import LoadingSpinner from '@/components/cours/LoadingSpinner';
import { useFormations, useUserEnrollments } from '@/hooks/useFormations';
import { useTeacherFormations } from '@/hooks/useTeacherFormations';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const Cours = () => {
  const [selectedFormation, setSelectedFormation] = useState(null);
  const [selectedLesson, setSelectedLesson] = useState(null);
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

  const isLessonUnlocked = (formations: any[], formationId: number, levelId: number, lessonId: number) => {
    const formation = formations.find(f => f.id === formationId);
    if (!formation) return false;
    
    const level = formation.levels?.find(l => l.id === levelId);
    if (!level) return false;
    
    const lessonIndex = level.lessons?.findIndex(l => l.id === lessonId);
    if (lessonIndex === 0) return true;
    
    for (let i = 0; i < lessonIndex; i++) {
      const lesson = level.lessons[i];
      const progress = lesson.user_lesson_progress?.[0];
      
      if (!progress || progress.status !== 'completed') {
        return false;
      }
      
      if (lesson.exercises && lesson.exercises.length > 0) {
        const exercisesValidated = lesson.exercises.every(exercise => {
          const submissions = lesson.exercise_submissions?.filter(sub => 
            sub.exercise_id === exercise.id && sub.user_id === user?.id
          );
          
          return submissions?.some(sub => sub.status === 'approved');
        });
        
        if (!exercisesValidated) {
          return false;
        }
      }
    }
    
    return true;
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

  if (selectedLesson) {
    return (
      <ChatInterface
        lesson={selectedLesson}
        formation={selectedFormation}
        onBack={() => setSelectedLesson(null)}
      />
    );
  }

  if (selectedFormation && selectedFormation.isTeacher) {
    return (
      <TeacherView
        formation={selectedFormation}
        onBack={() => setSelectedFormation(null)}
      />
    );
  }

  if (selectedFormation) {
    return (
      <FormationDetail
        formation={selectedFormation}
        onBack={() => setSelectedFormation(null)}
        onLessonClick={setSelectedLesson}
      />
    );
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
    <div className="bg-gray-50 pt-16 pb-24 md:pb-4">
      <CoursHeader 
        title="Mes Formations" 
        subtitle="Continuez votre apprentissage" 
      />

      <div className="p-4 space-y-6 pt-16">
        <FormationSection
          title="Mes cours suivis"
          icon="student"
          formations={studentFormations}
          isTeacherSection={false}
          onFormationClick={setSelectedFormation}
          emptyMessage="Vous n'êtes inscrit à aucune formation"
          debugInfo={debugMessage}
        />

        {teacherFormations && teacherFormations.length > 0 && (
          <FormationSection
            title="Espace enseignant"
            icon="teacher"
            formations={teacherFormations}
            isTeacherSection={true}
            onFormationClick={setSelectedFormation}
          />
        )}
      </div>
    </div>
  );
};

export default Cours;
