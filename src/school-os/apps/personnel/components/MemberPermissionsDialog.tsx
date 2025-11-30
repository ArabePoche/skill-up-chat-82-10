/**
 * Dialog de gestion des permissions spécifiques à un membre
 * Toutes les permissions sont modifiables (ajout, retrait, exclusion du rôle)
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  useUserExtraPermissions,
  useAddUserExtraPermission,
  useRemoveUserExtraPermission,
} from '@/school-os/hooks/useUserExtraPermissions';
import {
  useUserPermissionExclusions,
  useAddPermissionExclusion,
  useRemovePermissionExclusion,
} from '@/school-os/hooks/useUserPermissionExclusions';
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
  const userId = member.user_id;
  const roleId = member.school_roles?.id;

  // Récupérer toutes les permissions disponibles
  const { data: allPermissions = [] } = useQuery({
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

  // Récupérer les permissions héritées du rôle
  const { data: rolePermissions = [] } = useQuery({
    queryKey: ['role-permissions-inherited', roleId, schoolId],
    queryFn: async () => {
      if (!roleId) return [];

      const { data, error } = await supabase
        .from('school_role_permissions')
        .select('permission_code')
        .eq('role_id', roleId)
        .eq('enabled', true)
        .or(`school_id.is.null,school_id.eq.${schoolId}`);

      if (error) throw error;
      return data?.map(p => p.permission_code) || [];
    },
    enabled: !!roleId && isOpen,
  });

  // Récupérer les permissions supplémentaires de l'utilisateur
  const { data: extraPermissions = [], isLoading: loadingExtra } = useUserExtraPermissions(schoolId, userId || undefined);
  const extraPermissionCodes = extraPermissions.map(p => p.permission_code);

  // Récupérer les exclusions de permissions de l'utilisateur
  const { data: exclusions = [], isLoading: loadingExclusions } = useUserPermissionExclusions(schoolId, userId || undefined);
  const excludedPermissionCodes = exclusions.map(e => e.permission_code);

  // Mutations
  const addExtraPermission = useAddUserExtraPermission();
  const removeExtraPermission = useRemoveUserExtraPermission();
  const addExclusion = useAddPermissionExclusion();
  const removeExclusion = useRemovePermissionExclusion();

  const isLoading = loadingExtra || loadingExclusions;

  const permissionsByCategory = allPermissions.reduce((acc, perm) => {
    if (!acc[perm.category]) {
      acc[perm.category] = [];
    }
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  // Vérifie si une permission est héritée du rôle (et non exclue)
  const isInheritedFromRole = (code: string): boolean => {
    return rolePermissions.includes(code);
  };

  // Vérifie si une permission est exclue
  const isExcluded = (code: string): boolean => {
    return excludedPermissionCodes.includes(code);
  };

  // Vérifie si une permission est accordée en extra
  const isExtraPermission = (code: string): boolean => {
    return extraPermissionCodes.includes(code);
  };

  // Vérifie si la permission est active (héritée non-exclue OU extra)
  const isPermissionEnabled = (code: string): boolean => {
    const inherited = isInheritedFromRole(code);
    const excluded = isExcluded(code);
    const extra = isExtraPermission(code);
    
    // Active si: (héritée ET non-exclue) OU extra
    return (inherited && !excluded) || extra;
  };

  const handleTogglePermission = (permissionCode: string) => {
    if (!userId) return;

    const inherited = isInheritedFromRole(permissionCode);
    const excluded = isExcluded(permissionCode);
    const extra = isExtraPermission(permissionCode);
    const currentlyEnabled = isPermissionEnabled(permissionCode);

    if (currentlyEnabled) {
      // Désactiver la permission
      if (extra) {
        // Si c'est une extra, on la retire
        removeExtraPermission.mutate({ schoolId, userId, permissionCode });
      }
      if (inherited && !excluded) {
        // Si c'est héritée du rôle, on ajoute une exclusion
        addExclusion.mutate({ schoolId, userId, permissionCode });
      }
    } else {
      // Activer la permission
      if (excluded) {
        // Si exclue, on retire l'exclusion
        removeExclusion.mutate({ schoolId, userId, permissionCode });
      }
      if (!inherited) {
        // Si pas héritée, on ajoute en extra
        addExtraPermission.mutate({ schoolId, userId, permissionCode });
      }
    }
  };

  const hasUser = !!userId;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] sm:max-h-[90vh] flex flex-col p-4 sm:p-6">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-base sm:text-lg">
            Permissions - {member.profiles?.first_name || member.first_name} {member.profiles?.last_name || member.last_name}
          </DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-2">
            <span>Rôle:</span>
            <Badge variant="secondary">{member.school_roles?.name || member.position || 'Aucun rôle'}</Badge>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 pr-2 sm:pr-4">
          {!hasUser ? (
            <div className="flex items-center justify-center py-8 px-4 text-center">
              <p className="text-muted-foreground">
                Ce membre n'a pas de compte utilisateur lié. Impossible de gérer ses permissions individuelles.
              </p>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Chargement...</p>
            </div>
          ) : (
            <Accordion type="multiple" className="w-full">
              {Object.entries(permissionsByCategory).map(([category, perms]) => {
                const enabledCount = perms.filter(p => isPermissionEnabled(p.code)).length;

                return (
                  <AccordionItem key={category} value={category}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-2">
                        {CATEGORY_ICONS[category] || <Settings className="w-4 h-4" />}
                        <span>{CATEGORY_LABELS[category] || category}</span>
                        <Badge variant="outline" className="ml-2">
                          {enabledCount}/{perms.length}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 pl-2 sm:pl-6">
                        {perms.map((perm) => {
                          const enabled = isPermissionEnabled(perm.code);
                          const inherited = isInheritedFromRole(perm.code);
                          const excluded = isExcluded(perm.code);
                          const extra = isExtraPermission(perm.code);

                          return (
                            <div
                              key={perm.code}
                              className="flex items-start gap-2 sm:gap-3 p-2 rounded hover:bg-muted/50"
                            >
                              <Checkbox
                                id={perm.code}
                                checked={enabled}
                                onCheckedChange={() => handleTogglePermission(perm.code)}
                                className="mt-0.5"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Label
                                    htmlFor={perm.code}
                                    className="cursor-pointer font-medium text-xs sm:text-sm leading-tight"
                                  >
                                    {perm.name}
                                  </Label>
                                  {inherited && !excluded && (
                                    <Badge variant="secondary" className="text-[10px] px-1 py-0">
                                      Rôle
                                    </Badge>
                                  )}
                                  {excluded && (
                                    <Badge variant="destructive" className="text-[10px] px-1 py-0">
                                      Exclu
                                    </Badge>
                                  )}
                                  {extra && (
                                    <Badge className="text-[10px] px-1 py-0 bg-primary/20 text-primary">
                                      Extra
                                    </Badge>
                                  )}
                                </div>
                                {perm.description && (
                                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                    {perm.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
