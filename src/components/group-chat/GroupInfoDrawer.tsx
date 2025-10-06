
/**
 * Drawer d'informations de groupe - Style WhatsApp
 * Affiche les infos du niveau et la liste des membres de la promotion
 */
import React from 'react';
import { X, Users, Calendar, User, Award } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePromotionMembers } from '@/hooks/group-chat/usePromotionMembers';
import { useLevelMembers } from '@/hooks/group-chat/useLevelMembers';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';

interface Level {
  id: string;
  title: string;
  description?: string;
  order_index: number;
}

interface Formation {
  id: string;
  title: string;
}

interface GroupInfoDrawerProps {
  level: Level;
  formation: Formation;
  promotionId: string | null;
  isOpen: boolean;
  onClose: () => void;
  isTeacher?: boolean;
}

export const GroupInfoDrawer: React.FC<GroupInfoDrawerProps> = ({
  level,
  formation,
  promotionId,
  isOpen,
  onClose,
  isTeacher = false
}) => {
  // Récupérer les infos de la promotion
  const { data: promotionData } = useQuery({
    queryKey: ['promotion-info', promotionId],
    queryFn: async () => {
      if (!promotionId) return null;
      const { data } = await supabase
        .from('promotions')
        .select('name')
        .eq('id', promotionId)
        .single();
      return data;
    },
    enabled: !!promotionId && !isTeacher,
  });

  // Côté professeur : élèves ayant accès au niveau spécifique
  // Côté élève : uniquement les membres de la même promotion filtrés par niveau
  const { data: levelMembers = [], isLoading: isLoadingLevel } = useLevelMembers(formation.id, level.id);
  const { data: promotionMembers = [], isLoading: isLoadingPromotion } = usePromotionMembers(
    formation.id, 
    promotionId,
    level.id // Passer le niveau actuel pour filtrer les membres
  );
  
  const members = isTeacher ? levelMembers : promotionMembers;
  const isLoading = isTeacher ? isLoadingLevel : isLoadingPromotion;

  if (!isOpen) return null;

  const getInitials = (firstName?: string, lastName?: string, username?: string) => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (username) {
      return username.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  const getMemberName = (member: any) => {
    const profile = member.profiles;
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    if (profile?.username) {
      return profile.username;
    }
    return 'Utilisateur';
  };

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 z-50 animate-in fade-in"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full md:w-96 bg-white z-50 shadow-xl animate-in slide-in-from-right">
        {/* Header */}
        <div className="bg-[#25d366] text-white p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Informations du groupe</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <ScrollArea className="h-[calc(100vh-64px)]">
          {/* Groupe Info Section */}
          <div className="p-6 border-b">
            <div className="flex flex-col items-center text-center mb-4">
              <div className="w-20 h-20 bg-[#25d366]/10 rounded-full flex items-center justify-center mb-3">
                <Users size={40} className="text-[#25d366]" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">{level.title}</h3>
              <p className="text-sm text-gray-500 mt-1">{formation.title}</p>
              {!isTeacher && promotionData?.name && (
                <Badge variant="secondary" className="mt-2">
                  {promotionData.name}
                </Badge>
              )}
            </div>

            {level.description && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700">{level.description}</p>
              </div>
            )}

            <div className="mt-4 flex items-center justify-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Users size={16} />
                <span>{members.length} membre{members.length > 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>

          {/* Membres Section */}
          <div className="p-4">
            <h4 className="text-sm font-semibold text-gray-500 uppercase mb-3 flex items-center gap-2">
              <Users size={16} />
              Membres ({members.length})
            </h4>

            {isLoading ? (
              <div className="text-center py-8 text-gray-500">
                Chargement des membres...
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Aucun membre dans cette promotion
              </div>
            ) : (
              <div className="space-y-1">
                {members.map((member) => {
                  const profile = member.profiles;
                  const currentLevel = (member as any).current_level;
                  
                  return (
                    <div
                      key={member.student_id}
                      className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={profile?.avatar_url || undefined} />
                        <AvatarFallback className="bg-[#25d366] text-white">
                          {getInitials(profile?.first_name, profile?.last_name, profile?.username)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {getMemberName(member)}
                          </p>
                          {currentLevel?.order_index !== undefined && (
                            <div className="flex items-center gap-0.5 shrink-0">
                              {Array.from({ length: currentLevel.order_index }).map((_, i) => (
                                <Award key={i} size={14} className="text-primary fill-primary" />
                              ))}
                            </div>
                          )}
                        </div>
                        {member.joined_at && (
                          <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                            <Calendar size={12} />
                            Membre depuis {new Date(member.joined_at).toLocaleDateString('fr-FR')}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </>
  );
};
