// Composant de notification de session en direct pour les élèves
import React from 'react';
import { Video, Phone, X, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface LiveSessionNotificationProps {
  sessionId: string;
  teacherName: string;
  formationTitle: string;
  lessonTitle: string;
  onAccept: () => void;
  onReject: () => void;
}

const LiveSessionNotification: React.FC<LiveSessionNotificationProps> = ({
  sessionId,
  teacherName,
  formationTitle,
  lessonTitle,
  onAccept,
  onReject
}) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-white dark:bg-gray-800 shadow-xl">
        <CardContent className="p-6">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{teacherName}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Professeur • {formationTitle}
              </p>
            </div>
          </div>

          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3 animate-pulse">
              <Video className="w-8 h-8 text-white" />
            </div>
            <h4 className="font-medium text-lg mb-2">
              Cours en direct
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {lessonTitle}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              Le professeur a commencé une session en direct
            </p>
          </div>

          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={onReject}
              className="flex-1 flex items-center space-x-2"
            >
              <X size={16} />
              <span>Refuser</span>
            </Button>
            
            <Button
              onClick={onAccept}
              className="flex-1 flex items-center space-x-2 bg-green-500 hover:bg-green-600"
            >
              <Video size={16} />
              <span>Rejoindre</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LiveSessionNotification;