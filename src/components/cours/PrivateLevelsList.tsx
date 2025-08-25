import React, { useState } from 'react';
import { ChevronDown, ChevronRight, MessageCircle, Check, Clock, Lock, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLessonUnlocking } from '@/hooks/useLessonUnlocking';
import { useUnreadMessagesByLevel } from '@/hooks/useUnreadMessagesByLevel';

interface Lesson {
  id: string | number;
  title: string;
  description?: string;
  order_index: number;
  exercises?: { id: string }[];
  user_lesson_progress?: {
    status: string;
    exercise_completed: boolean;
  }[];
}

interface Level {
  id: string | number;
  title: string;
  description?: string;
  order_index: number;
  lessons?: Lesson[];
}

interface PrivateLevelsListProps {
  levels: Level[];
  formationId: string;
  onLessonClick: (lesson: Lesson) => void;
}

const PrivateLevelsList: React.FC<PrivateLevelsListProps> = ({ levels, formationId, onLessonClick }) => {
  const [expandedLevels, setExpandedLevels] = useState<string[]>([]);
  const { data: unlockedLessons = [] } = useLessonUnlocking(formationId);
  const { data: unreadCounts = {} } = useUnreadMessagesByLevel(formationId);

  const toggleLevel = (levelId: string) => {
    setExpandedLevels(prev =>
      prev.includes(levelId) ? prev.filter(id => id !== levelId) : [...prev, levelId]
    );
  };

  const isLessonUnlocked = (lessonId: string | number) => {
    return unlockedLessons.some(lesson => lesson.lesson_id === lessonId.toString());
  };

  const getLessonStatus = (lessonId: string | number) => {
    const lessonProgress = unlockedLessons.find(lesson => lesson.lesson_id === lessonId.toString());
    return lessonProgress ? lessonProgress.status : 'locked';
  };

  const renderLessonStatusIcon = (lessonId: string | number) => {
    const status = getLessonStatus(lessonId);

    switch (status) {
      case 'completed':
        return <Check size={16} className="text-green-500" />;
      case 'not_started':
      case 'in_progress':
      case 'awaiting_review':
        return <Clock size={16} className="text-blue-500" />;
      default:
        return <Lock size={16} className="text-gray-400" />;
    }
  };

  const getLevelUnreadCount = (levelId: string | number) => {
    return unreadCounts[levelId.toString()]?.level || 0;
  };

  const getLessonUnreadCount = (levelId: string | number, lessonId: string | number) => {
    return unreadCounts[levelId.toString()]?.lessons[lessonId.toString()] || 0;
  };

  // Trier les niveaux par order_index
  const sortedLevels = [...levels].sort((a, b) => a.order_index - b.order_index);

  return (
    <div className="space-y-2 bg-[#e5ddd5] p-4">
      {sortedLevels.map(level => {
        // Trier les leçons par order_index
        const sortedLessons = level.lessons ? [...level.lessons].sort((a, b) => a.order_index - b.order_index) : [];
        
        return (
          <div key={level.id} className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* Level Header - Style WhatsApp amélioré */}
            <div
              className="flex items-center justify-between p-4 bg-[#f0f0f0] hover:bg-[#e8e8e8] cursor-pointer border-b border-gray-200"
              onClick={() => toggleLevel(level.id.toString())}
            >
              <div className="flex items-center space-x-3">
                {expandedLevels.includes(level.id.toString()) ? (
                  <ChevronDown size={20} className="text-[#25d366]" />
                ) : (
                  <ChevronRight size={20} className="text-[#25d366]" />
                )}
                
                {/* Avatar du niveau */}
                <div className="w-10 h-10 bg-[#25d366] rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">📚</span>
                </div>
                
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-800">{level.title}</h3>
                  <p className="text-sm text-gray-500">
                    {sortedLessons.length || 0} leçon{sortedLessons.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {/* Badge des messages non lus du niveau  */}
                {getLevelUnreadCount(level.id) > 0 && (
                  <Badge variant="destructive" className="bg-red-500 text-white rounded-full px-2 py-1 text-xs font-bold min-w-[20px] h-5 flex items-center justify-center">
                    {getLevelUnreadCount(level.id) > 99 ? '99+' : getLevelUnreadCount(level.id)}
                  </Badge>
                )}
              </div>
            </div>

            {/* Lessons List - Style WhatsApp avec badges */}
            {expandedLevels.includes(level.id.toString()) && (
              <div className="bg-white">
                {sortedLessons.map((lesson, index) => (
                  <div
                    key={lesson.id}
                    className={`flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer
                      ${index !== sortedLessons.length - 1 ? 'border-b border-gray-100' : ''}
                      ${!isLessonUnlocked(lesson.id) ? 'opacity-60' : ''}
                    `}
                    onClick={() => isLessonUnlocked(lesson.id) && onLessonClick(lesson)}
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      {/* Avatar de la leçon */}
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        {renderLessonStatusIcon(lesson.id)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className={`font-medium truncate ${
                            isLessonUnlocked(lesson.id) ? 'text-gray-800' : 'text-gray-500'
                          }`}>
                            {lesson.title}
                          </h4>
                          
                          <div className="flex items-center space-x-2 ml-2">
                            {/* Badge des messages non lus de la leçon */}
                            {getLessonUnreadCount(level.id, lesson.id) > 0 && (
                              <Badge variant="destructive" className="bg-red-500 text-white rounded-full px-2 py-1 text-xs font-bold min-w-[20px] h-5 flex items-center justify-center">
                                {getLessonUnreadCount(level.id, lesson.id) > 99 ? '99+' : getLessonUnreadCount(level.id, lesson.id)}
                              </Badge>
                            )}
                            
                            {/* Icône de message si la leçon a des discussions */}
                            {getLessonUnreadCount(level.id, lesson.id) > 0 && (
                              <MessageCircle size={14} className="text-red-500" />
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs text-gray-500 truncate">
                            {getLessonStatus(lesson.id) === 'completed' ? '✅ Terminée' : 
                             getLessonStatus(lesson.id) === 'in_progress' ? '⏳ En cours' :
                             getLessonStatus(lesson.id) === 'awaiting_review' ? '⏳ En attente' :
                             isLessonUnlocked(lesson.id) ? '📖 Disponible' : '🔒 Verrouillée'}
                          </p>
                          
                          {/* Timestamp style WhatsApp */}
                          <span className="text-xs text-gray-400">
                            {getLessonUnreadCount(level.id, lesson.id) > 0 ? 'Nouveau' : ''}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bouton d'action */}
                    <Button
                      variant={isLessonUnlocked(lesson.id) ? "default" : "secondary"}
                      size="sm"
                      disabled={!isLessonUnlocked(lesson.id)}
                      className={`ml-3 ${
                        isLessonUnlocked(lesson.id) 
                          ? 'bg-[#25d366] hover:bg-[#20c55a] text-white' 
                          : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isLessonUnlocked(lesson.id)) {
                          onLessonClick(lesson);
                        }
                      }}
                    >
                      {isLessonUnlocked(lesson.id) ? (
                        <>
                          <Play size={14} className="mr-1" />
                          Ouvrir
                        </>
                      ) : (
                        '🔒 Verrouillé'
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default PrivateLevelsList;