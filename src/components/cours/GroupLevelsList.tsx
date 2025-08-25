import React from 'react';
import { MessageCircle, Check, Clock, Lock, Users } from 'lucide-react';
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
}

interface Level {
  id: string | number;
  title: string;
  description?: string;
  order_index: number;
  lessons?: Lesson[];
}

interface GroupLevelsListProps {
  levels: Level[];
  formationId: string;
  onLevelClick: (level: Level) => void;
}

const GroupLevelsList: React.FC<GroupLevelsListProps> = ({ levels, formationId, onLevelClick }) => {
  const { data: unlockedLessons = [] } = useLessonUnlocking(formationId);
  const { data: unreadCounts = {} } = useUnreadMessagesByLevel(formationId);

  const getLevelUnreadCount = (levelId: string | number) => {
    return unreadCounts[levelId.toString()]?.level || 0;
  };

  const isLevelUnlocked = (level: Level) => {
    if (!level.lessons || level.lessons.length === 0) return true;
    
    // Un niveau est débloqué si au moins une de ses leçons est débloquée
    return level.lessons.some(lesson => 
      unlockedLessons.some(unlockedLesson => unlockedLesson.lesson_id === lesson.id.toString())
    );
  };

  const getLevelProgress = (level: Level) => {
    if (!level.lessons || level.lessons.length === 0) return 0;
    
    const completedLessons = level.lessons.filter(lesson =>
      unlockedLessons.some(unlockedLesson => 
        unlockedLesson.lesson_id === lesson.id.toString() && 
        unlockedLesson.status === 'completed'
      )
    );
    
    return Math.round((completedLessons.length / level.lessons.length) * 100);
  };

  const getLevelStatusIcon = (level: Level) => {
    const progress = getLevelProgress(level);
    const isUnlocked = isLevelUnlocked(level);
    
    if (!isUnlocked) return <Lock size={20} className="text-gray-400" />;
    if (progress === 100) return <Check size={20} className="text-green-500" />;
    if (progress > 0) return <Clock size={20} className="text-blue-500" />;
    return <Users size={20} className="text-blue-400" />;
  };

  // Trier les niveaux par order_index
  const sortedLevels = [...levels].sort((a, b) => a.order_index - b.order_index);

  return (
    <div className="space-y-2 bg-[#e5ddd5] p-4">
      {sortedLevels.map(level => {
        const progress = getLevelProgress(level);
        const isUnlocked = isLevelUnlocked(level);
        const unreadCount = getLevelUnreadCount(level.id);
        
        return (
          <div
            key={level.id}
            className={`bg-white rounded-lg shadow-md overflow-hidden cursor-pointer transition-all hover:shadow-lg ${
              !isUnlocked ? 'opacity-60' : ''
            }`}
            onClick={() => isUnlocked && onLevelClick(level)}
          >
            {/* Level Card - Style simple pour les groupes */}
            <div className="flex items-center justify-between p-4 hover:bg-gray-50">
              <div className="flex items-center space-x-3 flex-1">
                {/* Avatar du niveau avec icône de statut */}
                <div className="w-12 h-12 bg-[#25d366] rounded-full flex items-center justify-center flex-shrink-0">
                  {getLevelStatusIcon(level)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className={`text-lg font-semibold truncate ${
                      isUnlocked ? 'text-gray-800' : 'text-gray-500'
                    }`}>
                      {level.title}
                    </h3>
                    
                    <div className="flex items-center space-x-2 ml-2">
                      {/* Badge des messages non lus */}
                      {unreadCount > 0 && (
                        <Badge variant="destructive" className="bg-red-500 text-white rounded-full px-2 py-1 text-xs font-bold min-w-[20px] h-5 flex items-center justify-center">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </Badge>
                      )}
                      
                      {/* Icône de message si des discussions */}
                      {unreadCount > 0 && (
                        <MessageCircle size={16} className="text-red-500" />
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-sm text-gray-500">
                      {level.lessons?.length || 0} leçon{(level.lessons?.length || 0) !== 1 ? 's' : ''} • 
                      Progression : {progress}%
                    </p>
                    
                    {level.description && (
                      <span className="text-xs text-gray-400 truncate ml-2 max-w-[120px]">
                        {level.description}
                      </span>
                    )}
                  </div>
                  
                  {/* Barre de progression */}
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        progress === 100 ? 'bg-green-500' : progress > 0 ? 'bg-blue-500' : 'bg-gray-300'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Bouton d'action */}
              <Button
                variant={isUnlocked ? "default" : "secondary"}
                size="sm"
                disabled={!isUnlocked}
                className={`ml-3 ${
                  isUnlocked 
                    ? 'bg-[#25d366] hover:bg-[#20c55a] text-white' 
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isUnlocked) {
                    onLevelClick(level);
                  }
                }}
              >
                {isUnlocked ? (
                  <>
                    <MessageCircle size={14} className="mr-1" />
                    Chat
                  </>
                ) : (
                  '🔒 Verrouillé'
                )}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default GroupLevelsList;