
import React, { useRef, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useIsTeacherInFormation } from '@/hooks/useIsTeacherInFormation';
import MessageItem from './MessageItem';
import SystemMessage from './SystemMessage';
import ExerciseDisplay from './ExerciseDisplay';
import CelebrationAnimation from './CelebrationAnimation';
import TypingIndicator from './TypingIndicator';
import InterviewEvaluationCard from './InterviewEvaluationCard';
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages';
import { useTypingListener } from '@/hooks/useTypingListener';
import { useStudentEvaluations } from '@/hooks/useStudentEvaluations';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  message_type: string;
  file_url?: string;
  file_type?: string;
  file_name?: string;
  is_exercise_submission?: boolean;
  is_system_message?: boolean;
  exercise_status?: string;
  exercise_id?: string;
  created_at: string;
  profiles?: {
    id?: string;
    first_name?: string;
    last_name?: string;
    username?: string;
    avatar_url?: string;
    is_teacher?: boolean;
  };
}

interface Exercise {
  id: string;
  title: string;
  description?: string;
  content?: string;
}

interface MessageListProps {
  messages: Message[];
  exercises: Exercise[];
  lesson: { 
    id: number | string;
    title: string;
  };
  formationId: string;
  isTeacherView?: boolean;
  studentName?: string;
  isTeacher?: boolean;
  onValidateExercise: (messageId: string, isValid: boolean) => void;
}

const MessageList: React.FC<MessageListProps> = ({
  messages,
  exercises,
  lesson,
  formationId,
  isTeacherView = false,
  studentName,
  onValidateExercise
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const [showCelebration, setShowCelebration] = useState(false);
  
  // Vérifier si l'utilisateur est professeur dans cette formation
  const { data: isTeacherInThisFormation = false } = useIsTeacherInFormation(formationId);
  
  // Écouter les indicateurs de frappe
  const typingUsers = useTypingListener(lesson.id.toString(), formationId);

  // Activer les mises à jour temps réel
  useRealtimeMessages(lesson.id.toString(), formationId);

  // Récupérer les évaluations en attente pour les étudiants
  const { data: pendingEvaluations = [] } = useStudentEvaluations();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  // Vérifier si un exercice a déjà été soumis
  const isExerciseSubmitted = (exerciseId: string) => {
    return messages.some(msg => 
      msg.is_exercise_submission && 
      msg.sender_id === user?.id &&
      msg.exercise_id === exerciseId
    );
  };

  // Récupérer l'exercice par son ID
  const getExerciseById = (exerciseId: string) => {
    return exercises.find(ex => ex.id === exerciseId);
  };

  console.log('MessageList render - messages count:', messages?.length || 0);
  console.log('Typing users:', typingUsers);
  console.log('Pending evaluations:', pendingEvaluations);
  console.log('Is teacher in this formation:', isTeacherInThisFormation);

  return (
    <div className="flex-1 p-4 space-y-4 custom-scrollbar overflow-y-auto">
      {/* Animation de célébration */}
      <CelebrationAnimation 
        show={showCelebration} 
        onComplete={() => setShowCelebration(false)}
      />

      {/* Message système de bienvenue */}
      <div className="text-center">
        <span className="bg-[#dcf8c6] text-gray-700 px-3 py-2 rounded-lg text-sm shadow-sm">
          {isTeacherView 
            ? `Discussion avec ${studentName}` 
            : `Bienvenue dans la leçon: ${lesson.title}`
          }
        </span>
      </div>

      {/* Messages avec mises à jour temps réel */}
      {messages && messages.length > 0 ? (
        messages.map((msg) => {
          // Message système avec exercice
          if (msg.is_system_message && msg.exercise_id) {
            const exercise = getExerciseById(msg.exercise_id);
            return (
              <div key={msg.id} className="message-appear">
                <SystemMessage
                  content={msg.content}
                  exercise={exercise}
                  lessonId={lesson.id.toString()}
                  formationId={formationId}
                  isTeacherView={isTeacherView}
                />
              </div>
            );
          }

          // Message système simple
          if (msg.is_system_message) {
            return (
              <div key={msg.id} className="message-appear">
                <SystemMessage
                  content={msg.content}
                  lessonId={lesson.id.toString()}
                  formationId={formationId}
                  isTeacherView={isTeacherView}
                />
              </div>
            );
          }

          // Messages normaux (soumissions d'exercices et messages texte)
          return (
            <div key={msg.id} className="message-appear">
              <MessageItem
                message={msg}
                isTeacher={isTeacherInThisFormation}
                onValidateExercise={onValidateExercise}
              />
            </div>
          );
        })
      ) : (
        <div className="text-center text-gray-500 py-8">
          <p>Aucun message pour le moment</p>
        </div>
      )}

      {/* Affichage des évaluations en attente pour les étudiants - APRÈS les messages */}
      {!isTeacherView && pendingEvaluations.map((evaluation) => {
        // Vérifier si l'évaluation a des données de professeur valides
        const teacherName = evaluation.teachers && typeof evaluation.teachers === 'object' && 'profiles' in evaluation.teachers
          ? (() => {
              const profiles = evaluation.teachers.profiles;
              if (profiles && typeof profiles === 'object') {
                const firstName = 'first_name' in profiles ? profiles.first_name || '' : '';
                const lastName = 'last_name' in profiles ? profiles.last_name || '' : '';
                const username = 'username' in profiles ? profiles.username || '' : '';
                return `${firstName} ${lastName}`.trim() || username || 'Professeur';
              }
              return 'Professeur';
            })()
          : 'Professeur';

        return (
          <InterviewEvaluationCard
            key={evaluation.id}
            evaluationId={evaluation.id}
            teacherName={teacherName}
            expiresAt={evaluation.expires_at}
          />
        );
      })}

      {/* Indicateurs de frappe */}
      {typingUsers.map(user => (
        <TypingIndicator
          key={user.user_id}
          userName={user.user_name}
          isTeacher={user.is_teacher}
        />
      ))}

      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;
