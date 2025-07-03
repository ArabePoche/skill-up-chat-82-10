
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, MessageSquare } from 'lucide-react';
import StudentEvaluationModal from './StudentEvaluationModal';

interface EvaluationNotificationProps {
  evaluationId: string;
  teacherName: string;
  expiresAt: string;
}

const EvaluationNotification: React.FC<EvaluationNotificationProps> = ({
  evaluationId,
  teacherName,
  expiresAt
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const timeLeft = new Date(expiresAt).getTime() - new Date().getTime();
  const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));

  return (
    <>
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 my-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
              <Star size={20} className="text-white" />
            </div>
            
            <div className="flex-1">
              <h3 className="font-semibold text-gray-800 mb-1">
                📋 Évaluation d'entretien
              </h3>
              <p className="text-sm text-gray-600 mb-2">
                Votre entretien avec <strong>{teacherName}</strong> s'est terminé.
              </p>
              <p className="text-xs text-blue-600">
                ⏰ Expire dans {hoursLeft}h
              </p>
            </div>
          </div>
          
          <Badge variant="destructive" className="bg-red-500">
            Urgent
          </Badge>
        </div>
        
        <div className="mt-3 flex gap-2">
          <Button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white flex items-center gap-2"
            size="sm"
          >
            <MessageSquare size={16} />
            Répondre à l'enquête
          </Button>
        </div>
      </div>

      <StudentEvaluationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        evaluationId={evaluationId}
        teacherName={teacherName}
      />
    </>
  );
};

export default EvaluationNotification;
