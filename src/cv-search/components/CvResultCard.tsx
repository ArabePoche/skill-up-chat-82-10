/**
 * Carte de résultat de recherche CV
 * Affiche un aperçu compact d'un CV public avec bouton d'invitation
 */
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, MapPin, Briefcase, GraduationCap, Send, Eye, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PublicCvResult } from '../hooks/useSearchCvs';
import { CvInviteModal } from './CvInviteModal';
import { useCheckExistingInvitation } from '../hooks/useCvInvitations';

interface CvResultCardProps {
  cv: PublicCvResult;
  currentUserId?: string;
  shopId?: string;
}

export const CvResultCard: React.FC<CvResultCardProps> = ({ cv, currentUserId, shopId }) => {
  const navigate = useNavigate();
  const [inviteOpen, setInviteOpen] = useState(false);
  const personalInfo = cv.personal_info || {};
  const skills = Array.isArray(cv.skills) ? cv.skills : [];
  const experiences = Array.isArray(cv.experiences) ? cv.experiences : [];
  const education = Array.isArray(cv.education) ? cv.education : [];

  const { data: existingInvitation } = useCheckExistingInvitation(
    currentUserId || '',
    cv.id
  );

  const latestExp = experiences[0];
  const latestEdu = education[0];

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Avatar className="w-12 h-12 shrink-0">
              <AvatarImage src={cv.profile?.avatar_url} />
              <AvatarFallback className="bg-primary/10 text-primary">
                <User size={20} />
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm truncate">
                {personalInfo.fullName || `${cv.profile?.first_name || ''} ${cv.profile?.last_name || ''}`}
              </h3>
              {personalInfo.title && (
                <p className="text-xs text-muted-foreground truncate">{personalInfo.title}</p>
              )}

              {personalInfo.address && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin size={10} />
                  {personalInfo.address}
                </p>
              )}

              {latestExp && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Briefcase size={10} />
                  {latestExp.position} — {latestExp.company}
                </p>
              )}

              {latestEdu && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <GraduationCap size={10} />
                  {latestEdu.degree} {latestEdu.field}
                </p>
              )}

              {skills.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {skills.slice(0, 5).map((s: any, i: number) => (
                    <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">
                      {s.name}
                    </Badge>
                  ))}
                  {skills.length > 5 && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      +{skills.length - 5}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 mt-3">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => navigate(`/cv/${cv.id}`)}
            >
              <Eye size={12} className="mr-1" />
              Voir le CV
            </Button>
            {currentUserId && currentUserId !== cv.user_id && (
              <Button
                size="sm"
                className="flex-1 text-xs"
                disabled={!!existingInvitation}
                onClick={() => setInviteOpen(true)}
              >
                {existingInvitation ? (
                  <>
                    <Check size={12} className="mr-1" />
                    Déjà invité
                  </>
                ) : (
                  <>
                    <Send size={12} className="mr-1" />
                    Inviter
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {currentUserId && (
        <CvInviteModal
          isOpen={inviteOpen}
          onClose={() => setInviteOpen(false)}
          cvId={cv.id}
          cvOwnerId={cv.user_id}
          inviterId={currentUserId}
          shopId={shopId}
          candidateName={personalInfo.fullName || cv.profile?.first_name || 'Candidat'}
        />
      )}
    </>
  );
};
