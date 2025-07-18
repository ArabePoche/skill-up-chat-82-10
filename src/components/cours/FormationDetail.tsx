
import React, { useState, useEffect } from 'react';
import { ArrowLeft, BookOpen, Users, Clock, Star } from 'lucide-react';
import LevelsList from '../LevelsList';
import TeacherView from '../TeacherView';
import FormationPricing from '../FormationPricing';
import { useUserRole } from '@/hooks/useUserRole';

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
  const { data: userRole } = useUserRole(String(formation.id));

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
                  <span>{formation.students_count} étudiants</span>
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
        </div>
      </div>

      {/* Formation Description */}
      {formation.description && (
        <div className="bg-white p-4 mb-2 shadow-sm">
          <p className="text-gray-600 text-sm leading-relaxed">{formation.description}</p>
        </div>
      )}

     

      {/* Lessons List */}
      <LevelsList 
        levels={formation.levels}
        formationId={String(formation.id)}
        onLessonClick={onLessonClick}
      />
    </div>
  );
};

export default FormationDetail;
