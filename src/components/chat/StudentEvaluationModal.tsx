
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star, ThumbsUp, ThumbsDown } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface StudentEvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
  evaluationId: string;
  teacherName: string;
}

const StudentEvaluationModal: React.FC<StudentEvaluationModalProps> = ({
  isOpen,
  onClose,
  evaluationId,
  teacherName
}) => {
  const [isSatisfied, setIsSatisfied] = useState<boolean | null>(null);
  const [rating, setRating] = useState(0);
  const [wantsSameTeacher, setWantsSameTeacher] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (isSatisfied === null) {
      toast.error('Veuillez indiquer si vous êtes satisfait');
      return;
    }

    if (isSatisfied && rating === 0) {
      toast.error('Veuillez noter votre professeur');
      return;
    }

    if (wantsSameTeacher === null) {
      toast.error('Veuillez indiquer si vous souhaitez continuer avec ce professeur');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('interview_evaluations')
        .update({
          is_satisfied: isSatisfied,
          satisfaction_rating: isSatisfied ? rating : null,
          teacher_rating: isSatisfied ? rating : null,
          wants_same_teacher: wantsSameTeacher,
          responded_at: new Date().toISOString()
        })
        .eq('id', evaluationId);

      if (error) {
        throw error;
      }

      toast.success('Merci pour votre évaluation! 🙏');
      onClose();

    } catch (error) {
      console.error('Error submitting evaluation:', error);
      toast.error('Erreur lors de l\'envoi de l\'évaluation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            📋 Évaluation de l'entretien
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="text-center">
            <p className="text-gray-600">
              Comment s'est passé votre entretien avec <strong>{teacherName}</strong> ?
            </p>
          </div>

          {/* Question 1: Satisfaction */}
          <div className="space-y-3">
            <h3 className="font-medium">1. Êtes-vous satisfait de cet entretien ?</h3>
            <div className="flex gap-3 justify-center">
              <Button
                variant={isSatisfied === true ? 'default' : 'outline'}
                onClick={() => setIsSatisfied(true)}
                className="flex items-center gap-2"
              >
                <ThumbsUp size={16} />
                Oui, satisfait
              </Button>
              <Button
                variant={isSatisfied === false ? 'default' : 'outline'}
                onClick={() => setIsSatisfied(false)}
                className="flex items-center gap-2"
              >
                <ThumbsDown size={16} />
                Non, pas satisfait
              </Button>
            </div>
          </div>

          {/* Question 2: Note (si satisfait) */}
          {isSatisfied === true && (
            <div className="space-y-3">
              <h3 className="font-medium">2. Notez ce professeur</h3>
              <div className="flex gap-1 justify-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className={`p-1 ${star <= rating ? 'text-yellow-500' : 'text-gray-300'}`}
                  >
                    <Star size={24} fill={star <= rating ? 'currentColor' : 'none'} />
                  </button>
                ))}
              </div>
              <p className="text-sm text-gray-500 text-center">
                {rating === 0 && 'Cliquez sur les étoiles pour noter'}
                {rating === 1 && 'Très décevant'}
                {rating === 2 && 'Décevant'}
                {rating === 3 && 'Correct'}
                {rating === 4 && 'Bien'}
                {rating === 5 && 'Excellent'}
              </p>
            </div>
          )}

          {/* Question 3: Continuer avec ce prof */}
          <div className="space-y-3">
            <h3 className="font-medium">3. Souhaitez-vous être suivi par ce professeur à l'avenir ?</h3>
            <div className="flex gap-3 justify-center">
              <Button
                variant={wantsSameTeacher === true ? 'default' : 'outline'}
                onClick={() => setWantsSameTeacher(true)}
                size="sm"
              >
                Oui
              </Button>
              <Button
                variant={wantsSameTeacher === false ? 'default' : 'outline'}
                onClick={() => setWantsSameTeacher(false)}
                size="sm"
              >
                Non
              </Button>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Plus tard
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Envoi...' : 'Envoyer l\'évaluation'}
            </Button>
          </div>

          <div className="text-xs text-gray-500 text-center">
            ⏰ Vous avez 24h pour répondre. Passé ce délai, nous considérerons que vous êtes satisfait.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StudentEvaluationModal;
