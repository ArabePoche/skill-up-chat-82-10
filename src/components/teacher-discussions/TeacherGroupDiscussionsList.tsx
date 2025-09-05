import React from 'react';
import { useTeacherGroupDiscussions } from '@/hooks/teacher-discussions/useTeacherGroupDiscussions';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Users, MessageSquare } from 'lucide-react';

interface TeacherGroupDiscussionsListProps {
  formationId: string;
  onSelectGroupDiscussion: (levelId: string, formationId: string, levelTitle: string) => void;
}

/**
 * Composant pour afficher les discussions de groupe côté professeur
 * (organisé par niveau)
 */
const TeacherGroupDiscussionsList: React.FC<TeacherGroupDiscussionsListProps> = ({ 
  formationId, 
  onSelectGroupDiscussion 
}) => {
  const { data: discussions, isLoading } = useTeacherGroupDiscussions(formationId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-edu-primary"></div>
      </div>
    );
  }

  if (!discussions || discussions.length === 0) {
    return (
      <div className="text-center p-8 text-gray-500">
        <Users size={48} className="mx-auto mb-4 opacity-50" />
        <p>Aucune discussion de groupe pour le moment</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2 mb-4">
        <Users size={20} className="text-green-600" />
        <h2 className="text-lg font-semibold">Discussions de groupe</h2>
        <Badge variant="secondary">{discussions.length}</Badge>
      </div>
      
      {discussions.map((discussion) => (
        <div
          key={discussion.level_id}
          onClick={() => onSelectGroupDiscussion(discussion.level_id, formationId, discussion.level_title)}
          className="flex items-center space-x-3 p-4 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors border-l-4 border-green-200 bg-green-50/30"
        >
          <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <Users size={24} className="text-green-600" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-medium text-gray-900 truncate">
                  {discussion.level_title}
                </h3>
                <Badge variant="outline" className="text-xs">
                  Niveau {discussion.level_order}
                </Badge>
              </div>
              
              <div className="flex items-center space-x-2">
                {discussion.unread_count > 0 && (
                  <Badge variant="default" className="bg-green-600">
                    {discussion.unread_count}
                  </Badge>
                )}
                <Badge variant="secondary" className="text-xs">
                  {discussion.students_count} étudiant{discussion.students_count > 1 ? 's' : ''}
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 mt-1">
              <MessageSquare size={14} className="text-green-600" />
              <p className="text-sm text-green-700 font-medium">
                Discussion de groupe • Toutes promotions
              </p>
            </div>
            
            <p className="text-xs text-gray-500 truncate mt-1">
              {discussion.last_message_content}
            </p>
            
            <p className="text-xs text-gray-400 mt-1">
              {discussion.last_message_time && formatDistanceToNow(
                new Date(discussion.last_message_time), 
                { addSuffix: true, locale: fr }
              )}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TeacherGroupDiscussionsList;