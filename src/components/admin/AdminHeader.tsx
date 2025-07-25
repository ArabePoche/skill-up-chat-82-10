import React from 'react';
import { Users, Activity, MessageCircle, CheckCircle, Clock, Crown, Globe, GraduationCap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AdminHeaderProps {
  profileName: string;
  profileRole: string;
}

export function AdminHeader({ profileName, profileRole }: AdminHeaderProps) {
  const { data: stats } = useQuery({
    queryKey: ['admin-header-stats'],
    queryFn: async () => {
      const [usersResult, countriesResult, onlineUsersResult, studentsResult] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact' }),
        supabase.from('profiles').select('country').not('country', 'is', null),
        // Simuler les utilisateurs en ligne - à remplacer par une vraie logique de présence
        supabase.from('profiles').select('id', { count: 'exact' }).limit(89),
        supabase.from('enrollment_requests').select('id', { count: 'exact' }).eq('status', 'approved')
      ]);

      // Compter les pays uniques
      const uniqueCountries = new Set(
        countriesResult.data?.map(profile => profile.country).filter(Boolean)
      );

      return {
        users: usersResult.count || 0,
        countries: uniqueCountries.size,
        onlineUsers: 89, // Nombre simulé d'utilisateurs en ligne
        students: studentsResult.count || 0
      };
    },
    refetchInterval: 30000 // Actualiser toutes les 30 secondes
  });

  return (
    <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4">
        <SidebarTrigger className="mr-4" />
        <div className="flex-1">
          <h1 className="text-xl font-semibold">Tableau de bord administrateur</h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-1">
          <p className="text-xs text-red-700">
            <strong>{profileName}</strong>
            <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
              {profileRole.toUpperCase()}
            </span>
          </p>
        </div>
      </div>
      
      {/* Quick Stats */}
      <div className="p-4 border-b">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-blue-100 text-xs truncate">Utilisateurs</p>
                  <p className="text-xl font-bold">{stats?.users || 0}</p>
                </div>
                <Users className="w-6 h-6 text-blue-200 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-green-100 text-xs truncate">Pays</p>
                  <p className="text-xl font-bold">{stats?.countries || 0}</p>
                </div>
                <Globe className="w-6 h-6 text-green-200 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-purple-100 text-xs truncate">En ligne</p>
                  <p className="text-xl font-bold">{stats?.onlineUsers || 0}</p>
                </div>
                <Activity className="w-6 h-6 text-purple-200 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-orange-100 text-xs truncate">Élèves</p>
                  <p className="text-xl font-bold">{stats?.students || 0}</p>
                </div>
                <GraduationCap className="w-6 h-6 text-orange-200 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
