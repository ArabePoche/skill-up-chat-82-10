import React from 'react';
import { Users, Activity, MessageCircle, CheckCircle, Clock, Crown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { SidebarTrigger } from '@/components/ui/sidebar';

interface AdminHeaderProps {
  profileName: string;
  profileRole: string;
}

export function AdminHeader({ profileName, profileRole }: AdminHeaderProps) {
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-blue-100 text-xs truncate">Utilisateurs</p>
                  <p className="text-xl font-bold">1,247</p>
                </div>
                <Users className="w-6 h-6 text-blue-200 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-green-100 text-xs truncate">En ligne</p>
                  <p className="text-xl font-bold">89</p>
                </div>
                <Activity className="w-6 h-6 text-green-200 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-purple-100 text-xs truncate">Messages</p>
                  <p className="text-xl font-bold">5,432</p>
                </div>
                <MessageCircle className="w-6 h-6 text-purple-200 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-orange-100 text-xs truncate">Exercices</p>
                  <p className="text-xl font-bold">1,234</p>
                </div>
                <CheckCircle className="w-6 h-6 text-orange-200 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-teal-500 to-teal-600 text-white">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-teal-100 text-xs truncate">Temps moy.</p>
                  <p className="text-xl font-bold">2h15</p>
                </div>
                <Clock className="w-6 h-6 text-teal-200 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-yellow-100 text-xs truncate">Top Prof</p>
                  <p className="text-xl font-bold">Marie</p>
                </div>
                <Crown className="w-6 h-6 text-yellow-200 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}