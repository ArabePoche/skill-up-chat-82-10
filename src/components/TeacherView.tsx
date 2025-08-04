
import React, { useState } from 'react';
import { ArrowLeft, MessageCircle, BookOpen, Play, Phone } from 'lucide-react';
import TeacherDiscussionsList from './TeacherDiscussionsList';
import TeacherStudentChat from './TeacherStudentChat';
import LessonVideoPlayer from './LessonVideoPlayer';
import { useUnreadMessagesBadge } from '@/hooks/useUnreadMessagesBadge';
import { useIncomingCalls } from '@/hooks/useIncomingCalls';
import { useDirectCallModal } from '@/hooks/useDirectCallModal';
import { useTeacherDiscussionsWithUnread } from '@/hooks/useTeacherDiscussionsWithUnread';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import CallsModal from './teacher/CallsModal';
import TeacherCallModal from './live-classroom/TeacherCallModal';

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
  const [showCallsModal, setShowCallsModal] = useState(false);
  const { data: unreadCount = 0 } = useUnreadMessagesBadge(formation.id);
  const { data: discussions } = useTeacherDiscussionsWithUnread(formation.id);
  const { incomingCalls } = useIncomingCalls(formation.id);
  
  // Pour les appels directs quand on est en chat avec un étudiant
  const { directCall, acceptDirectCall, rejectDirectCall } = useDirectCallModal(
    selectedDiscussion?.studentId,
    selectedDiscussion?.lessonId
  );

  const handleSelectDiscussion = (studentId: string, formationId: string, lessonId: string) => {
    // Trouver la discussion correspondante
    const selectedDiscussionData = discussions?.find(
      discussion => discussion.student_id === studentId && discussion.lesson_id === lessonId
    );
    
    // Construire le nom de l'étudiant à partir du profil
    const studentName = selectedDiscussionData?.student_profile ? 
      `${selectedDiscussionData.student_profile.first_name || ''} ${selectedDiscussionData.student_profile.last_name || ''}`.trim() || 
      selectedDiscussionData.student_profile.username || 'Étudiant' : 'Étudiant';
    
    setSelectedDiscussion({
      studentId,
      lessonId,
      studentName,
      lessonTitle: selectedDiscussionData?.lesson_title || 'Leçon',
      studentProfile: selectedDiscussionData?.student_profile || null
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
          title: selectedDiscussion.lessonTitle,
          video_url: ""
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
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">Actions rapides</h3>
          
          {/* Bouton Appels avec badge */}
          <Button
            onClick={() => setShowCallsModal(true)}
            variant="outline"
            className="relative flex items-center space-x-2"
          >
            <Phone className="h-4 w-4" />
            <span>Appels</span>
            {incomingCalls.length > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs flex items-center justify-center"
              >
                {incomingCalls.length}
              </Badge>
            )}
          </Button>
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
      </div>

      {/* Liste des discussions */}
      <TeacherDiscussionsList
        formationId={formation.id}
        onSelectDiscussion={handleSelectDiscussion}
      />
      {/* Modal de liste des appels */}
      <CallsModal
        isOpen={showCallsModal}
        onClose={() => setShowCallsModal(false)}
        formationId={formation.id}
        incomingCalls={incomingCalls}
      />

      {/* Modal d'appel direct (quand en chat avec l'étudiant) */}
      {directCall && (
        <TeacherCallModal
          isOpen={true}
          onAccept={async () => {
            const success = await acceptDirectCall();
            if (success) {
              console.log('Appel direct accepté');
              // TODO: Rediriger vers l'interface d'appel
            }
          }}
          onReject={async () => {
            await rejectDirectCall();
          }}
          studentName={directCall.caller_name}
          studentAvatar={directCall.caller_avatar}
          callType={directCall.call_type}
          formationTitle={formation.title}
          lessonTitle={selectedDiscussion?.lessonTitle}
        />
      )}
    </div>
  );
};

export default TeacherView;