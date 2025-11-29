/**
 * Composant de gestion des rôles et permissions de l'école
 */
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { toast } from 'sonner';
import { 
  Shield, 
  Plus, 
  Edit2, 
  Trash2, 
  Lock,
  Users,
  Settings,
  BookOpen,
  GraduationCap,
  CreditCard,
  MessageSquare,
  ClipboardCheck,
  Calendar
} from 'lucide-react';
import { ROLE_LABELS, ROLE_DESCRIPTIONS } from '@/school/hooks/useSchoolRoles';

interface RolesSettingsProps {
  schoolId: string;
}

interface SchoolRole {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  school_id: string | null;
}

interface Permission {
  code: string;
  name: string;
  description: string | null;
  category: string;
}

interface RolePermission {
  permission_code: string;
  enabled: boolean;
}

// Icônes par catégorie
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  apps: <Settings className="w-4 h-4" />,
  students: <GraduationCap className="w-4 h-4" />,
  classes: <Users className="w-4 h-4" />,
  teachers: <BookOpen className="w-4 h-4" />,
  grades: <ClipboardCheck className="w-4 h-4" />,
  attendance: <Calendar className="w-4 h-4" />,
  payments: <CreditCard className="w-4 h-4" />,
  messages: <MessageSquare className="w-4 h-4" />,
  families: <Users className="w-4 h-4" />,
  schedule: <Calendar className="w-4 h-4" />,
  reports: <ClipboardCheck className="w-4 h-4" />,
  settings: <Settings className="w-4 h-4" />,
};

const CATEGORY_LABELS: Record<string, string> = {
  apps: 'Applications',
  students: 'Élèves',
  classes: 'Classes',
  teachers: 'Enseignants',
  grades: 'Notes',
  attendance: 'Présences',
  payments: 'Paiements',
  messages: 'Messages',
  families: 'Familles',
  schedule: 'Emploi du temps',
  reports: 'Rapports',
  settings: 'Paramètres',
};

export const RolesSettings: React.FC<RolesSettingsProps> = ({ schoolId }) => {
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<SchoolRole | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');

  // Récupérer tous les rôles (système + personnalisés)
  const { data: roles = [], isLoading: isLoadingRoles } = useQuery({
    queryKey: ['school-roles-settings', schoolId],
    queryFn: async (): Promise<SchoolRole[]> => {
      const { data, error } = await supabase
        .from('school_roles')
        .select('*')
        .or(`school_id.is.null,school_id.eq.${schoolId}`)
        .order('is_system', { ascending: false })
        .order('name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!schoolId,
  });

  // Récupérer toutes les permissions disponibles
  const { data: permissions = [] } = useQuery({
    queryKey: ['school-permissions'],
    queryFn: async (): Promise<Permission[]> => {
      const { data, error } = await supabase
        .from('school_permissions')
        .select('*')
        .order('category')
        .order('name');

      if (error) throw error;
      return data || [];
    },
  });

  // Récupérer les permissions d'un rôle
  const { data: rolePermissions = [], isLoading: isLoadingPermissions } = useQuery({
    queryKey: ['role-permissions', selectedRole?.id, schoolId],
    queryFn: async (): Promise<RolePermission[]> => {
      if (!selectedRole) return [];

      const { data, error } = await supabase
        .from('school_role_permissions')
        .select('permission_code, enabled')
        .eq('role_id', selectedRole.id)
        .or(`school_id.is.null,school_id.eq.${schoolId}`);

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedRole && isPermissionsModalOpen,
  });

  // Créer un nouveau rôle
  const createRoleMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('school_roles')
        .insert({
          name: newRoleName.toLowerCase().replace(/\s+/g, '_'),
          description: newRoleDescription,
          is_system: false,
          school_id: schoolId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-roles-settings'] });
      toast.success('Rôle créé avec succès');
      setIsCreateModalOpen(false);
      setNewRoleName('');
      setNewRoleDescription('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de la création du rôle');
    },
  });

  // Supprimer un rôle personnalisé
  const deleteRoleMutation = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase
        .from('school_roles')
        .delete()
        .eq('id', roleId)
        .eq('school_id', schoolId)
        .eq('is_system', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-roles-settings'] });
      toast.success('Rôle supprimé');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de la suppression');
    },
  });

  // Mettre à jour une permission
  const updatePermissionMutation = useMutation({
    mutationFn: async ({ permissionCode, enabled }: { permissionCode: string; enabled: boolean }) => {
      if (!selectedRole) throw new Error('Aucun rôle sélectionné');

      // Vérifier si la permission existe déjà
      const { data: existing } = await supabase
        .from('school_role_permissions')
        .select('id')
        .eq('role_id', selectedRole.id)
        .eq('permission_code', permissionCode)
        .eq('school_id', schoolId)
        .maybeSingle();

      if (existing) {
        // Mettre à jour
        const { error } = await supabase
          .from('school_role_permissions')
          .update({ enabled })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Créer
        const { error } = await supabase
          .from('school_role_permissions')
          .insert({
            role_id: selectedRole.id,
            permission_code: permissionCode,
            enabled,
            school_id: schoolId,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de la mise à jour');
    },
  });

  // Grouper les permissions par catégorie
  const permissionsByCategory = permissions.reduce((acc, perm) => {
    if (!acc[perm.category]) {
      acc[perm.category] = [];
    }
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  // Vérifier si une permission est activée
  const isPermissionEnabled = (code: string): boolean => {
    const found = rolePermissions.find(rp => rp.permission_code === code);
    return found?.enabled ?? false;
  };

  const getRoleLabel = (role: SchoolRole): string => {
    return ROLE_LABELS[role.name] || role.name;
  };

  const getRoleDescription = (role: SchoolRole): string => {
    return role.description || ROLE_DESCRIPTIONS[role.name] || '';
  };

  if (isLoadingRoles) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground">Chargement des rôles...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Rôles et permissions
              </CardTitle>
              <CardDescription className="mt-1.5">
                Gérez les rôles et leurs permissions pour votre école
              </CardDescription>
            </div>
            <Button onClick={() => setIsCreateModalOpen(true)} className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Nouveau rôle
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Vue mobile */}
          <div className="block lg:hidden space-y-4">
            {roles.map((role) => (
              <Card key={role.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      {role.is_system ? (
                        <Lock className="w-5 h-5 text-primary" />
                      ) : (
                        <Shield className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium">{getRoleLabel(role)}</h4>
                        {role.is_system && (
                          <Badge variant="secondary" className="text-xs">
                            Système
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {getRoleDescription(role)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedRole(role);
                        setIsPermissionsModalOpen(true);
                      }}
                      className="flex-1"
                    >
                      <Edit2 className="w-3 h-3 mr-1" />
                      Permissions
                    </Button>
                    {!role.is_system && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm(`Supprimer le rôle "${getRoleLabel(role)}" ?`)) {
                            deleteRoleMutation.mutate(role.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Vue desktop */}
          <div className="hidden lg:block space-y-4">
            {roles.map((role) => (
              <div
                key={role.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    {role.is_system ? (
                      <Lock className="w-5 h-5 text-primary" />
                    ) : (
                      <Shield className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{getRoleLabel(role)}</h4>
                      {role.is_system && (
                        <Badge variant="secondary" className="text-xs">
                          Système
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {getRoleDescription(role)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedRole(role);
                      setIsPermissionsModalOpen(true);
                    }}
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Permissions
                  </Button>
                  {!role.is_system && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm(`Supprimer le rôle "${getRoleLabel(role)}" ?`)) {
                          deleteRoleMutation.mutate(role.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Modal création de rôle */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer un nouveau rôle</DialogTitle>
            <DialogDescription>
              Créez un rôle personnalisé pour votre école
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="role-name">Nom du rôle</Label>
              <Input
                id="role-name"
                placeholder="Ex: Surveillant, Bibliothécaire..."
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role-description">Description</Label>
              <Textarea
                id="role-description"
                placeholder="Décrivez les responsabilités de ce rôle..."
                value={newRoleDescription}
                onChange={(e) => setNewRoleDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={() => createRoleMutation.mutate()}
              disabled={!newRoleName.trim() || createRoleMutation.isPending}
            >
              Créer le rôle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal gestion des permissions */}
      <Dialog open={isPermissionsModalOpen} onOpenChange={setIsPermissionsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Permissions - {selectedRole && getRoleLabel(selectedRole)}
            </DialogTitle>
            <DialogDescription>
              {selectedRole?.is_system 
                ? "Les rôles système ont des permissions par défaut. Vous pouvez les personnaliser pour votre école."
                : "Configurez les permissions pour ce rôle personnalisé."
              }
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh] pr-4">
            {isLoadingPermissions ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-muted-foreground">Chargement...</p>
              </div>
            ) : (
              <Accordion type="multiple" className="w-full">
                {Object.entries(permissionsByCategory).map(([category, perms]) => (
                  <AccordionItem key={category} value={category}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-2">
                        {CATEGORY_ICONS[category] || <Settings className="w-4 h-4" />}
                        <span>{CATEGORY_LABELS[category] || category}</span>
                        <Badge variant="outline" className="ml-2">
                          {perms.filter(p => isPermissionEnabled(p.code)).length}/{perms.length}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 pl-6">
                        {perms.map((perm) => (
                          <div
                            key={perm.code}
                            className="flex items-start gap-3 p-2 rounded hover:bg-muted/50"
                          >
                            <Checkbox
                              id={perm.code}
                              checked={isPermissionEnabled(perm.code)}
                              onCheckedChange={(checked) => {
                                updatePermissionMutation.mutate({
                                  permissionCode: perm.code,
                                  enabled: !!checked,
                                });
                              }}
                            />
                            <div className="flex-1">
                              <Label 
                                htmlFor={perm.code} 
                                className="cursor-pointer font-medium"
                              >
                                {perm.name}
                              </Label>
                              {perm.description && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {perm.description}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </ScrollArea>

          <Separator />
          
          <DialogFooter>
            <Button onClick={() => setIsPermissionsModalOpen(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
