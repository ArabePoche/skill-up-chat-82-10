
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Star, ThumbsUp, ThumbsDown, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { useSubmitEvaluation } from '@/hooks/useSubmitEvaluation';

interface InterviewEvaluationCardProps {
  evaluationId: string;
  teacherName: string;
  expiresAt: string;
}

const InterviewEvaluationCard: React.FC<InterviewEvaluationCardProps> = ({
  evaluationId,
  teacherName,
  expiresAt
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSatisfied, setIsSatisfied] = useState<boolean | null>(null);
  const [rating, setRating] = useState(0);
  const [wantsSameTeacher, setWantsSameTeacher] = useState<boolean | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const submitEvaluation = useSubmitEvaluation();

  const timeLeft = new Date(expiresAt).getTime() - new Date().getTime();
  const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));

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
      toast.error('Veuillez indiquer si vous souhaitez avoir à nouveau ce professeur');
      return;
    }

    try {
      await submitEvaluation.mutateAsync({
        evaluationId,
        isSatisfied,
        rating: isSatisfied ? rating : undefined,
        wantsSameTeacher
      });
      
      setIsSubmitted(true);
    } catch (error) {
      // L'erreur est déjà gérée dans le hook
    }
  };

  if (isSubmitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
        <div className="flex items-center space-x-2 mb-2">
          <div className="w-8 h-8 bg-green-500 rounded-full text-white text-sm flex items-center justify-center">
            ✓
          </div>
          <span className="text-sm font-medium text-green-700">Évaluation envoyée</span>
        </div>
        <p className="text-sm text-green-600">
          Merci pour votre évaluation de l'entretien avec {teacherName}.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            className="w-full flex items-center justify-between p-0 h-auto text-left hover:bg-orange-100"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-orange-500 rounded-full text-white text-sm flex items-center justify-center">
                <MessageSquare size={18} />
              </div>
              <div>
                <span className="text-sm font-medium text-orange-700 block">
                  Évaluation d'entretien requise
                </span>
                <span className="text-xs text-orange-600">
                  Entretien avec {teacherName} - {hoursLeft}h restantes
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                Urgent
              </span>
              {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-4 space-y-4">
          <h4 className="font-semibold text-gray-800">
            Comment s'est passé votre entretien avec {teacherName} ?
          </h4>
          
          {/* Question 1: Satisfaction */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">1. Êtes-vous satisfait de cet entretien ?</p>
            <div className="flex gap-2">
              <Button
                variant={isSatisfied === true ? 'default' : 'outline'}
                size="sm"
                onClick={() => setIsSatisfied(true)}
                className={`flex items-center gap-1 ${
                  isSatisfied === true 
                    ? 'bg-orange-500 hover:bg-orange-600 text-white' 
                    : 'border-orange-200 text-orange-700 hover:bg-orange-50'
                }`}
              >
                <ThumbsUp size={14} />
                Oui
              </Button>
              <Button
                variant={isSatisfied === false ? 'default' : 'outline'}
                size="sm"
                onClick={() => setIsSatisfied(false)}
                className={`flex items-center gap-1 ${
                  isSatisfied === false 
                    ? 'bg-orange-500 hover:bg-orange-600 text-white' 
                    : 'border-orange-200 text-orange-700 hover:bg-orange-50'
                }`}
              >
                <ThumbsDown size={14} />
                Non
              </Button>
            </div>
          </div>

          {/* Question 2: Note (si satisfait) */}
          {isSatisfied === true && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">2. Notez ce professeur</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className={`p-1 ${star <= rating ? 'text-orange-500' : 'text-gray-300'} hover:text-orange-400`}
                  >
                    <Star size={20} fill={star <= rating ? 'currentColor' : 'none'} />
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <p className="text-xs text-gray-500">
                  {rating === 1 && 'Très décevant'}
                  {rating === 2 && 'Décevant'}
                  {rating === 3 && 'Correct'}
                  {rating === 4 && 'Bien'}
                  {rating === 5 && 'Excellent'}
                </p>
              )}
            </div>
          )}

          {/* Question 3: Continuer avec ce prof */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">3. Souhaitez-vous avoir à nouveau ce professeur pour un futur entretien ?</p>
            <div className="flex gap-2">
              <Button
                variant={wantsSameTeacher === true ? 'default' : 'outline'}
                size="sm"
                onClick={() => setWantsSameTeacher(true)}
                className={`${
                  wantsSameTeacher === true 
                    ? 'bg-orange-500 hover:bg-orange-600 text-white' 
                    : 'border-orange-200 text-orange-700 hover:bg-orange-50'
                }`}
              >
                Oui
              </Button>
              <Button
                variant={wantsSameTeacher === false ? 'default' : 'outline'}
                size="sm"
                onClick={() => setWantsSameTeacher(false)}
                className={`${
                  wantsSameTeacher === false 
                    ? 'bg-orange-500 hover:bg-orange-600 text-white' 
                    : 'border-orange-200 text-orange-700 hover:bg-orange-50'
                }`}
              >
                Non
              </Button>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleSubmit}
              disabled={submitEvaluation.isPending}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {submitEvaluation.isPending ? 'Envoi...' : 'Envoyer l\'évaluation'}
            </Button>
          </div>

          <div className="text-xs text-gray-500">
            ⏰ Vous avez {hoursLeft}h pour répondre. Passé ce délai, nous considérerons que vous êtes satisfait.
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default InterviewEvaluationCard;
