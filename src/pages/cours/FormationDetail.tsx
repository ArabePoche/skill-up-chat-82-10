import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import FormationDetail from '@/components/cours/FormationDetail';
import ChatInterface from '@/components/ChatInterface';
import { useFormationById } from '@/hooks/useFormations';
import { useOfflineSync } from '@/offline/hooks/useOfflineSync';
import { useTranslation } from 'react-i18next';
import { WifiOff, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const FormationDetailPage = () => {
  const { formationId } = useParams();
  const navigate = useNavigate();
  const [selectedLesson, setSelectedLesson] = useState(null);
  const { data: formation, isLoading, error } = useFormationById(formationId);
  const { isOnline } = useOfflineSync();
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

  // Message spécifique pour le mode hors ligne sans données en cache
  if (!isOnline && (!formation || error)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <WifiOff className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-4">Mode hors ligne</h1>
          <p className="text-muted-foreground mb-6">
            Cette formation n'est pas disponible hors ligne. Téléchargez-la depuis la page des cours quand vous êtes connecté pour y accéder sans internet.
          </p>
          <Button onClick={() => navigate('/cours')} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour aux cours
          </Button>
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