/**
 * Dialog de gestion des permissions d'un membre
 */
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { toast } from 'sonner';
import { ROLE_LABELS } from '@/school/hooks/useSchoolRoles';
import {
  Settings,
  Users,
  GraduationCap,
  BookOpen,
  ClipboardCheck,
  Calendar,
  CreditCard,
  MessageSquare,
} from 'lucide-react';

interface MemberPermissionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  member: {
    id: string;
    user_id?: string | null;
    role_id?: string;
    profiles?: {
      first_name: string | null;
      last_name: string | null;
    } | null;
    school_roles?: {
      id: string;
      name: string;
      description: string | null;
      is_system: boolean;
    } | null;
    // Support direct staff data
    first_name?: string;
    last_name?: string;
    position?: string | null;
  };
  schoolId: string;
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

export const MemberPermissionsDialog: React.FC<MemberPermissionsDialogProps> = ({
  isOpen,
  onClose,
  member,
  schoolId,
}) => {
  const queryClient = useQueryClient();

  // Récupérer toutes les permissions
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

  // Le rôle est déjà chargé dans member.school_roles
  const roleData = member.school_roles ? { id: member.school_roles.id } : null;

  // Récupérer les permissions du rôle
  const { data: rolePermissions = [], isLoading } = useQuery({
    queryKey: ['role-permissions-member', roleData?.id, schoolId],
    queryFn: async (): Promise<RolePermission[]> => {
      if (!roleData?.id) return [];

      const { data, error } = await supabase
        .from('school_role_permissions')
        .select('permission_code, enabled')
        .eq('role_id', roleData.id)
        .or(`school_id.is.null,school_id.eq.${schoolId}`);

      if (error) throw error;
      return data || [];
    },
    enabled: !!roleData?.id && isOpen,
  });

  // Mutation pour mettre à jour une permission
  const updatePermissionMutation = useMutation({
    mutationFn: async ({ permissionCode, enabled }: { permissionCode: string; enabled: boolean }) => {
      if (!roleData?.id) throw new Error('Rôle non trouvé');

      const { data: existing } = await supabase
        .from('school_role_permissions')
        .select('id')
        .eq('role_id', roleData.id)
        .eq('permission_code', permissionCode)
        .eq('school_id', schoolId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('school_role_permissions')
          .update({ enabled })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('school_role_permissions')
          .insert({
            role_id: roleData.id,
            permission_code: permissionCode,
            enabled,
            school_id: schoolId,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions-member'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de la mise à jour');
    },
  });

  const permissionsByCategory = permissions.reduce((acc, perm) => {
    if (!acc[perm.category]) {
      acc[perm.category] = [];
    }
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  const isPermissionEnabled = (code: string): boolean => {
    const found = rolePermissions.find(rp => rp.permission_code === code);
    return found?.enabled ?? false;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Permissions - {member.profiles?.first_name || member.first_name} {member.profiles?.last_name || member.last_name}
          </DialogTitle>
          <DialogDescription>
            Poste: <Badge variant="secondary" className="ml-2">{member.school_roles?.name || member.position || 'N/A'}</Badge>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          {isLoading ? (
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
                              className="cursor-pointer font-medium text-sm"
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
      </DialogContent>
    </Dialog>
  );
};
