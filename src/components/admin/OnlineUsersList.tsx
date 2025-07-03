
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Search, Filter, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface OnlineUser {
  id: string;
  first_name: string;
  last_name: string;
  username: string;
  avatar_url: string;
  role: string;
  last_seen: string;
  status: 'online' | 'away' | 'offline';
}

const OnlineUsersList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: onlineUsers, isLoading } = useQuery({
    queryKey: ['online-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Simuler le statut en ligne basé sur la dernière activité
      return data.map(user => ({
        ...user,
        last_seen: new Date().toISOString(),
        status: Math.random() > 0.3 ? 'online' : 'offline'
      })) as OnlineUser[];
    },
    refetchInterval: 30000 // Actualiser toutes les 30 secondes
  });

  const filteredUsers = onlineUsers?.filter(user => {
    const matchesSearch = searchTerm === '' || 
      user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const onlineCount = filteredUsers?.filter(user => user.status === 'online').length || 0;

  if (isLoading) {
    return <div className="text-center py-8">Chargement des utilisateurs en ligne...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users size={20} />
          Utilisateurs en ligne ({onlineCount})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filtres */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Rechercher un utilisateur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue placeholder="Rôle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="teacher">Professeur</SelectItem>
              <SelectItem value="user">Élève</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="online">En ligne</SelectItem>
              <SelectItem value="offline">Hors ligne</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Liste des utilisateurs */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredUsers?.map((user) => (
            <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img
                    src={user.avatar_url || '/placeholder.svg'}
                    alt={user.username || 'Avatar'}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                    user.status === 'online' ? 'bg-green-500' : 
                    user.status === 'away' ? 'bg-yellow-500' : 'bg-gray-400'
                  }`} />
                </div>
                
                <div>
                  <div className="font-medium">
                    {user.first_name} {user.last_name} 
                    {user.username && <span className="text-gray-500 ml-1">(@{user.username})</span>}
                  </div>
                  <div className="text-sm text-gray-500 flex items-center gap-1">
                    <Clock size={12} />
                    {user.status === 'online' ? 'En ligne maintenant' : 'Vu il y a 2h'}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge 
                  variant={user.role === 'admin' ? 'destructive' : user.role === 'teacher' ? 'default' : 'secondary'}
                >
                  {user.role === 'admin' ? 'Admin' : user.role === 'teacher' ? 'Prof' : 'Élève'}
                </Badge>
                <Badge variant={user.status === 'online' ? 'default' : 'secondary'}>
                  {user.status === 'online' ? 'En ligne' : 'Hors ligne'}
                </Badge>
              </div>
            </div>
          ))}
        </div>

        {filteredUsers?.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Aucun utilisateur trouvé
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OnlineUsersList;
