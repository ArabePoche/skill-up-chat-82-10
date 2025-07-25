
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, ShieldOff } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const UsersManagement = () => {
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    }
  });

  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'user' | 'admin' }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Rôle utilisateur mis à jour avec succès');
    },
    onError: (error) => {
      toast.error('Erreur lors de la mise à jour du rôle');
      console.error(error);
    }
  });

  const handleRoleChange = (userId: string, currentRole: string) => {
    const newRole: 'user' | 'admin' = currentRole === 'admin' ? 'user' : 'admin';
    if (confirm(`Êtes-vous sûr de vouloir ${newRole === 'admin' ? 'promouvoir cet utilisateur comme administrateur' : 'retirer les droits administrateur à cet utilisateur'} ?`)) {
      updateUserRoleMutation.mutate({ userId, role: newRole });
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="text-lg font-semibold mb-2">Chargement des utilisateurs...</div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestion des utilisateurs</CardTitle>
        <p className="text-sm text-gray-600">
          Gérez les rôles et permissions des utilisateurs de la plateforme
        </p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom complet</TableHead>
              <TableHead>Nom d'utilisateur</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>Enseignant</TableHead>
              <TableHead>Date d'inscription</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users?.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">
                  {`${user.first_name || ''} ${user.last_name || ''}`.trim() || 'N/A'}
                </TableCell>
                <TableCell>{user.username || 'N/A'}</TableCell>
                <TableCell>{user.email || 'N/A'}</TableCell>
                <TableCell>
                  <Badge variant={user.role === 'admin' ? 'destructive' : 'default'}>
                    {user.role === 'admin' ? 'Administrateur' : 'Utilisateur'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={user.is_teacher ? 'default' : 'outline'}>
                    {user.is_teacher ? 'Oui' : 'Non'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {user.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR') : 'N/A'}
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRoleChange(user.id, user.role)}
                    className={user.role === 'admin' ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}
                    disabled={updateUserRoleMutation.isPending}
                  >
                    {user.role === 'admin' ? (
                      <ShieldOff size={14} className="mr-1" />
                    ) : (
                      <Shield size={14} className="mr-1" />
                    )}
                    {user.role === 'admin' ? 'Retirer admin' : 'Promouvoir admin'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default UsersManagement;
