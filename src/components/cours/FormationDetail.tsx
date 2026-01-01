import React, { useState, useEffect } from 'react';
import { ArrowLeft, BookOpen, Users, Clock, Star } from 'lucide-react';
import PrivateLevelsList from './PrivateLevelsList';
import GroupLevelsList from './GroupLevelsList';
import TeacherView from '../TeacherView';
import FormationPricing from '../FormationPricing';
import { useUserRole } from '@/hooks/useUserRole';
import { useUserSubscription } from '@/hooks/useUserSubscription';
import PaymentRequestButton from '@/components/payments/PaymentRequestButton';
import PaymentProgressBar from '@/components/payments/PaymentProgressBar';
import PaymentHistoryList from '@/components/payments/PaymentHistoryList';
import { useStudentPaymentProgress } from '@/hooks/useStudentPaymentProgress';
import { GroupChatInterface } from '@/components/group-chat/GroupChatInterface';
import { useTranslation } from 'react-i18next';
import { OfflineDownloadButton } from '@/offline';

interface Lesson {
  id: number | string;
  title: string;
  completed?: boolean;
  duration: string;
  exercisesValidated?: number;
  totalExercises?: number;
  user_lesson_progress?: Array<{
    status: 'not_started' | 'in_progress' | 'awaiting_review' | 'completed';
    exercise_completed: boolean;
  }>;
  has_exercise?: boolean;
  description?: string;
  order_index: number;
  exercises?: { id: string }[];
}

interface Level {
  id: string | number;
  title: string;
  description?: string;
  order_index: number;
  lessons?: Lesson[];
}

interface Formation {
  id: number | string;
  title: string;
  description?: string;
  author?: string;
  image_url?: string;
  rating?: number;
  students_count?: number;
  duration_hours?: number;
  levels: Level[];
}

interface FormationDetailProps {
  formation: Formation;
  onBack: () => void;
  onLessonClick: (lesson: any) => void;
}

const FormationDetail: React.FC<FormationDetailProps> = ({ 
  formation, 
  onBack, 
  onLessonClick 
}) => {
  const { t } = useTranslation();
  const { data: userRole } = useUserRole(String(formation.id));
  const { subscription } = useUserSubscription(String(formation.id));
  const [selectedLevel, setSelectedLevel] = useState<Level | null>(null);

  // Gérer l'ancrage vers la section pricing
  useEffect(() => {
    if (window.location.hash === '#pricing') {
      setTimeout(() => {
        const pricingElement = document.getElementById('pricing');
        if (pricingElement) {
          pricingElement.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  }, []);

  const { data: paymentProgress } = useStudentPaymentProgress(String(formation.id));

  if (userRole?.role === 'teacher') {
    return (
      <TeacherView
        formation={{
          id: String(formation.id),
          title: formation.title,
          author: formation.author
        }}
        onBack={onBack}
      />
    );
  }

  // Gestion du plan groupe - Chat du level sélectionné
  if (selectedLevel && subscription?.plan_type === 'groupe') {
    return (
      <GroupChatInterface
        level={selectedLevel}
        formation={{
          id: String(formation.id),
          title: formation.title
        }}
        onBack={() => setSelectedLevel(null)}
      />
    );
  }

  const handleLevelClick = (level: Level) => {
    if (subscription?.plan_type === 'groupe') {
      setSelectedLevel(level);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Header style WhatsApp avec couleur verte */}
      <div className="bg-[#25d366] text-white sticky top-0 z-40 shadow-md">
        <div className="flex items-center p-4">
          <button
            onClick={onBack}
            className="mr-3 p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <ArrowLeft size={20} className="text-white" />
          </button>
          
          <div className="flex-1">
            <h1 className="font-bold text-lg text-white mb-1">{formation.title}</h1>
            <div className="flex items-center space-x-4 text-sm text-green-100">
              {formation.rating && (
                <div className="flex items-center">
                  <Star size={14} className="text-yellow-300 mr-1" />
                  <span>{formation.rating}</span>
                </div>
              )}
              {formation.students_count && (
                <div className="flex items-center">
                  <Users size={14} className="mr-1" />
                  <span>{formation.students_count} {t('formation.studentsCount')}</span>
                </div>
              )}
              {formation.duration_hours && (
                <div className="flex items-center">
                  <Clock size={14} className="mr-1" />
                  <span>{formation.duration_hours}h</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Bouton téléchargement offline */}
          <div className="ml-2">
            <OfflineDownloadButton 
              formationId={String(formation.id)} 
              formationTitle={formation.title}
            />
          </div>
        </div>
      </div>

      {/* Formation Description */}
      {formation.description && (
        <div className="bg-white p-4 mb-2 shadow-sm">
          <p className="text-gray-600 text-sm leading-relaxed">{formation.description}</p>
        </div>
      )}

      {/* Accès rapide - Boutons Paiement et Pricing */}
      <div className="bg-white p-4 mb-2 shadow-sm">
        <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
          <BookOpen size={16} className="mr-2" />
          {t('formation.quickAccess')}
        </h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => window.open(`/formation/${formation.id}/pricing`, '_blank')}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 px-4 rounded-lg font-medium transition-colors"
          >
            💳 {t('formation.subscriptionOptions')}
          </button>
          <div className="flex-1">
            <PaymentRequestButton formationId={String(formation.id)} />
          </div>
        </div>

        <div className="mt-4">
          <PaymentProgressBar 
            totalDaysRemaining={paymentProgress?.total_days_remaining ?? 0}
            maxDays={30}
          />
        </div>
      </div>

      {/* Historique des paiements */}
      <div className="bg-transparent px-4 mb-2">
        <PaymentHistoryList formationId={String(formation.id)} />
      </div>

      {/* Lessons List - Affichage conditionnel selon le plan */}
      {subscription?.plan_type === 'groupe' ? (
        <GroupLevelsList 
          levels={formation.levels}
          formationId={String(formation.id)}
          onLevelClick={handleLevelClick}
        />
      ) : (
        <PrivateLevelsList 
          levels={formation.levels}
          formationId={String(formation.id)}
          onLessonClick={onLessonClick}
        />
      )}
    </div>
  );
};

export default FormationDetail;