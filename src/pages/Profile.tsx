import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, MapPin, Calendar, Award } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

const Profile = () => {
  const { profileId } = useParams();
  const navigate = useNavigate();

  // Récupérer les informations du profil
  const { data: profile, isLoading } = useQuery({
    queryKey: ['user-profile', profileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!profileId,
  });

  // Récupérer les statistiques de l'utilisateur
  const { data: stats } = useQuery({
    queryKey: ['user-stats', profileId],
    queryFn: async () => {
      // Compter les formations complétées
      const { count: completedCount } = await supabase
        .from('user_lesson_progress')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profileId)
        .eq('status', 'completed');

      // Compter les exercices validés
      const { count: exercisesCount } = await supabase
        .from('lesson_messages')
        .select('*', { count: 'exact', head: true })
        .eq('sender_id', profileId)
        .eq('exercise_status', 'approved');

      return {
        completedLessons: completedCount || 0,
        validatedExercises: exercisesCount || 0,
      };
    },
    enabled: !!profileId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-16 md:pt-16 md:pb-0 flex items-center justify-center">
        <div className="text-gray-500">Chargement...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 pb-16 md:pt-16 md:pb-0">
        <div className="p-4">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="mr-2" size={20} />
            Retour
          </Button>
          <div className="text-center py-12">
            <p className="text-gray-500">Profil introuvable</p>
          </div>
        </div>
      </div>
    );
  }

  const displayName = profile.first_name && profile.last_name
    ? `${profile.first_name} ${profile.last_name}`
    : profile.username || 'Utilisateur';

  const initials = profile.first_name && profile.last_name
    ? `${profile.first_name.charAt(0)}${profile.last_name.charAt(0)}`.toUpperCase()
    : displayName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-gray-50 pb-16 md:pt-16 md:pb-0">
      {/* Header avec retour */}
      <div className="bg-white border-b sticky top-0 md:top-16 z-10">
        <div className="p-4 flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="hover:bg-gray-100"
          >
            <ArrowLeft size={20} />
          </Button>
          <h1 className="text-lg font-semibold text-gray-900">Profil</h1>
        </div>
      </div>

      {/* Profil header */}
      <div className="bg-gradient-to-b from-[#25d366] to-[#20ba5a] p-6 text-white">
        <div className="flex flex-col items-center text-center">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={displayName}
              className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover"
            />
          ) : (
            <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg bg-white/20 flex items-center justify-center">
              <span className="text-3xl font-bold">{initials}</span>
            </div>
          )}
          <h2 className="text-2xl font-bold mt-4">{displayName}</h2>
          {profile.bio && (
            <p className="text-white/90 mt-2 max-w-md">{profile.bio}</p>
          )}
          {profile.role && (
            <div className="mt-3 px-3 py-1 bg-white/20 rounded-full text-sm">
              {profile.role === 'admin' ? '👑 Administrateur' : 
               profile.is_teacher ? '👨‍🏫 Enseignant' : '🎓 Étudiant'}
            </div>
          )}
        </div>
      </div>

      {/* Statistiques */}
      <div className="bg-white mx-4 -mt-6 rounded-lg shadow-md p-4 grid grid-cols-2 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-[#25d366]">
            {stats?.completedLessons || 0}
          </div>
          <div className="text-sm text-gray-600">Leçons complétées</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-[#25d366]">
            {stats?.validatedExercises || 0}
          </div>
          <div className="text-sm text-gray-600">Exercices validés</div>
        </div>
      </div>

      {/* Informations détaillées */}
      <div className="p-4 space-y-4 mt-4">
        {/* Coordonnées */}
        {profile.phone && (
          <div className="bg-white rounded-lg shadow-sm p-4 space-y-3">
            <h3 className="font-semibold text-gray-900 mb-3">Coordonnées</h3>
            
            <div className="flex items-center gap-3 text-gray-600">
              <Phone size={18} className="text-[#25d366]" />
              <span>{profile.phone}</span>
            </div>
          </div>
        )}

        {/* Informations complémentaires */}
        {profile.country && (
          <div className="bg-white rounded-lg shadow-sm p-4 space-y-3">
            <h3 className="font-semibold text-gray-900 mb-3">Informations</h3>
            
            <div className="flex items-center gap-3 text-gray-600">
              <MapPin size={18} className="text-[#25d366]" />
              <span>{profile.country}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
