
import React, { useState } from 'react';
import { ArrowLeft, MessageCircle, BookOpen, Play } from 'lucide-react';
import TeacherDiscussionsList from './TeacherDiscussionsList';
import TeacherStudentChat from './TeacherStudentChat';
import LessonVideoPlayer from './LessonVideoPlayer';
import { useUnreadMessagesBadge } from '@/hooks/useUnreadMessagesBadge';
import { Badge } from '@/components/ui/badge';

interface TeacherViewProps {
  formation: {
    id: string;
    title: string;
    author?: string;
  };
  onBack: () => void;
}

const TeacherView: React.FC<TeacherViewProps> = ({ formation, onBack }) => {
  const [selectedDiscussion, setSelectedDiscussion] = useState<{
    studentId: string;
    lessonId: string;
    studentName: string;
    lessonTitle: string;
    studentProfile?: any;
  } | null>(null);

  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const { data: unreadCount = 0 } = useUnreadMessagesBadge(formation.id);

  const handleSelectDiscussion = (studentId: string, formationId: string, lessonId: string) => {
    setSelectedDiscussion({
      studentId,
      lessonId,
      studentName: 'Étudiant',
      lessonTitle: 'Leçon',
      studentProfile: null
    });
  };

  if (selectedDiscussion) {
    return (
      <TeacherStudentChat
        formation={formation}
        student={{
          id: selectedDiscussion.studentId,
          user_id: selectedDiscussion.studentId,
          profiles: selectedDiscussion.studentProfile
        }}
        lesson={{
          id: selectedDiscussion.lessonId,
          title: selectedDiscussion.lessonTitle
        }}
        onBack={() => setSelectedDiscussion(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#e5ddd5] pb-16 md:pt-16 md:pb-0">
      {/* Header - Style WhatsApp pour prof */}
      <div className="bg-[#25d366] text-white sticky top-0 md:top-16 z-40">
        <div className="flex items-center p-4">
          <button
            onClick={onBack}
            className="mr-3 p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mr-3">
            <span className="text-white font-bold text-sm">👨‍🏫</span>
          </div>
          <div className="flex-1">
            <h1 className="font-semibold text-lg">{formation.title}</h1>
            <p className="text-sm text-white/80">Vue Professeur • Discussions par leçon</p>
          </div>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="ml-2">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </div>
      </div>

      {/* Actions rapides */}
      <div className="bg-white p-4 border-b border-gray-200">
        <div className="flex space-x-3">
          <button
            onClick={() => setShowVideoPlayer(!showVideoPlayer)}
            className="flex items-center space-x-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Play size={16} />
            <span>Aperçu Formation</span>
          </button>
        </div>
        
        {showVideoPlayer && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-2">Aperçu de la formation</h3>
            <LessonVideoPlayer
              url=""
            />
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 p-4 border-b border-blue-200">
        <div className="flex items-center space-x-2 mb-2">
          <MessageCircle size={16} className="text-blue-600" />
          <h3 className="font-semibold text-blue-800">Discussions organisées par leçon</h3>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {unreadCount} non lu{unreadCount > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        <div className="text-sm text-blue-700 space-y-1">
          <p>• Les discussions avec messages non lus apparaissent en priorité</p>
          <p>• Les badges rouges indiquent le nombre de messages non lus</p>
          <p>• Cliquez sur une discussion pour la marquer comme lue automatiquement</p>
        </div>
      </div>

      {/* Liste des discussions */}
      <TeacherDiscussionsList
        formationId={formation.id}
        onSelectDiscussion={handleSelectDiscussion}
      />
    </div>
  );
};

export default TeacherView;
