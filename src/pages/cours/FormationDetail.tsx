
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import FormationDetail from '@/components/cours/FormationDetail';
import ChatInterface from '@/components/ChatInterface';
import { useFormationById } from '@/hooks/useFormations';
import Navbar from '@/components/Navbar';
import { useTranslation } from 'react-i18next';

const FormationDetailPage = () => {
  const { formationId } = useParams();
  const navigate = useNavigate();
  const [selectedLesson, setSelectedLesson] = useState(null);
  const { data: formation, isLoading, error } = useFormationById(formationId);
  const { t } = useTranslation();

  if (!formationId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">{t('formation.notFound')}</h1>
          <p className="text-muted-foreground">{t('formation.missingId')}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold text-foreground mb-4">{t('common.loading')}</h1>
          <p className="text-muted-foreground">{t('formation.loadingDetails')}</p>
        </div>
      </div>
    );
  }

  if (error || !formation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">{t('common.error')}</h1>
          <p className="text-muted-foreground">{t('formation.errorLoading')}</p>
        </div>
      </div>
    );
  }

  const handleBack = () => {
    navigate('/cours');
  };

  const handleLessonClick = (lesson: any) => {
    navigate(`/cours/lesson/${lesson.id}`, {
      state: { formationId, lesson }
    });
  };

  if (selectedLesson) {
    return (
      <ChatInterface
        lesson={selectedLesson}
        formation={{ id: formationId, title: formation.title }}
        onBack={() => setSelectedLesson(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <FormationDetail
        formation={{
          id: formation.id,
          title: formation.title,
          description: formation.description,
          author: formation.profiles ? `${formation.profiles.first_name} ${formation.profiles.last_name}` : '',
          image_url: formation.image_url,
          rating: formation.rating,
          students_count: formation.students_count,
          duration_hours: formation.duration_hours,
          levels: (formation.levels || []).map(level => ({
            ...level,
            id: level.id,
            lessons: (level.lessons || []).map(lesson => ({
              ...lesson,
              id: lesson.id
            }))
          }))
        }}
        onBack={handleBack}
        onLessonClick={handleLessonClick}
      />
    </div>
  );
};

export default FormationDetailPage;