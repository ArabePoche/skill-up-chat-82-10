/**
 * Liste des membres du personnel avec gestion des rôles
 */
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Search, Edit2, Trash2, UserPlus, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { useSchoolRoles, ROLE_LABELS } from '@/school/hooks/useSchoolRoles';
import { MemberPermissionsDialog } from './MemberPermissionsDialog';
import { useSchoolMembers, SchoolMemberWithRole } from '@/school/hooks/useSchoolMembers';

interface PersonnelListProps {
  schoolId: string;
}

export const PersonnelList: React.FC<PersonnelListProps> = ({ schoolId }) => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState<SchoolMemberWithRole | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);
  const [newRoleId, setNewRoleId] = useState('');

  // Récupérer les rôles disponibles
  const { data: roles = [] } = useSchoolRoles(schoolId);

  // Récupérer les membres via school_user_roles
  const { data: members = [], isLoading } = useSchoolMembers(schoolId);

  // Mutation pour changer le rôle
  const updateRoleMutation = useMutation({
    mutationFn: async ({ memberId, roleId }: { memberId: string; roleId: string }) => {
      const { error } = await supabase
        .from('school_user_roles')
        .update({ role_id: roleId })
        .eq('id', memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-members'] });
      queryClient.invalidateQueries({ queryKey: ['school-user-role'] });
      toast.success('Rôle mis à jour');
      setIsEditDialogOpen(false);
      setSelectedMember(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de la mise à jour');
    },
  });

  // Mutation pour supprimer un membre
  const deleteMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from('school_user_roles')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-members'] });
      queryClient.invalidateQueries({ queryKey: ['school-user-role'] });
      toast.success('Membre retiré de l\'école');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de la suppression');
    },
  });

  const handleEditRole = (member: SchoolMemberWithRole) => {
    setSelectedMember(member);
    setNewRoleId(member.role_id);
    setIsEditDialogOpen(true);
  };

  const handleManagePermissions = (member: SchoolMemberWithRole) => {
    setSelectedMember(member);
    setIsPermissionsDialogOpen(true);
  };

  const handleDeleteMember = (member: SchoolMemberWithRole) => {
    if (member.school_roles?.name === 'owner') {
      toast.error('Impossible de retirer le propriétaire');
      return;
    }

    if (confirm(`Retirer ${member.profiles?.first_name} ${member.profiles?.last_name} de l'école ?`)) {
      deleteMemberMutation.mutate(member.id);
    }
  };

  const filteredMembers = members.filter((member) => {
    const searchLower = searchQuery.toLowerCase();
    const fullName = `${member.profiles?.first_name || ''} ${member.profiles?.last_name || ''}`.toLowerCase();
    const email = (member.profiles?.email || '').toLowerCase();
    const username = (member.profiles?.username || '').toLowerCase();
    
    return fullName.includes(searchLower) || 
           email.includes(searchLower) || 
           username.includes(searchLower);
  });

  const getRoleLabel = (member: SchoolMemberWithRole): string => {
    const roleName = member.school_roles?.name || '';
    return ROLE_LABELS[roleName] || roleName;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Membres du personnel
            </CardTitle>
            <Button size="sm" className="w-full sm:w-auto">
              <UserPlus className="w-4 h-4 mr-2" />
              Inviter un membre
            </Button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un membre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Vue mobile */}
          <div className="block sm:hidden space-y-4">
            {filteredMembers.map((member) => (
              <Card key={member.id}>
                <CardContent className="p-4 space-y-3">
                  <div>
                    <p className="font-medium">
                      {member.profiles?.first_name} {member.profiles?.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground">{member.profiles?.email}</p>
                    <p className="text-xs text-muted-foreground">@{member.profiles?.username}</p>
                  </div>
                  
                  <div>
                    <Badge variant="secondary">
                      {getRoleLabel(member)}
                    </Badge>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditRole(member)}
                      className="flex-1"
                      disabled={member.school_roles?.name === 'owner'}
                    >
                      <Edit2 className="w-3 h-3 mr-1" />
                      Rôle
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleManagePermissions(member)}
                      className="flex-1"
                    >
                      <Shield className="w-3 h-3 mr-1" />
                      Permissions
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteMember(member)}
                      disabled={member.school_roles?.name === 'owner'}
                      className="text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Vue desktop */}
          <div className="hidden sm:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Nom d'utilisateur</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">
                      {member.profiles?.first_name} {member.profiles?.last_name}
                    </TableCell>
                    <TableCell>{member.profiles?.email}</TableCell>
                    <TableCell>@{member.profiles?.username}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {getRoleLabel(member)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditRole(member)}
                          disabled={member.school_roles?.name === 'owner'}
                        >
                          <Edit2 className="w-3 h-3 mr-1" />
                          Rôle
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleManagePermissions(member)}
                        >
                          <Shield className="w-3 h-3 mr-1" />
                          Permissions
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteMember(member)}
                          disabled={member.school_roles?.name === 'owner'}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredMembers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? 'Aucun membre trouvé' : 'Aucun membre dans cette école'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog modification du rôle */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le rôle</DialogTitle>
            <DialogDescription>
              Changez le rôle de {selectedMember?.profiles?.first_name} {selectedMember?.profiles?.last_name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Select value={newRoleId} onValueChange={setNewRoleId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un rôle" />
              </SelectTrigger>
              <SelectContent>
                {roles
                  .filter(role => role.name !== 'owner')
                  .map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {ROLE_LABELS[role.name] || role.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={() => {
                if (selectedMember && newRoleId) {
                  updateRoleMutation.mutate({ memberId: selectedMember.id, roleId: newRoleId });
                }
              }}
              disabled={!newRoleId || updateRoleMutation.isPending}
            >
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog gestion des permissions */}
      {selectedMember && (
        <MemberPermissionsDialog
          isOpen={isPermissionsDialogOpen}
          onClose={() => {
            setIsPermissionsDialogOpen(false);
            setSelectedMember(null);
          }}
          member={selectedMember}
          schoolId={schoolId}
        />
      )}
    </>
  );
};
