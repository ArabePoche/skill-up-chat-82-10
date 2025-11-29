import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useTranslation } from 'react-i18next';
import { useSchoolJoinRequest } from '../hooks/useSchoolJoinRequest';
import { useAuth } from '@/hooks/useAuth';
import { useSchoolClasses } from '../hooks/useClasses';
import { useAssignableRoles, ROLE_LABELS, ROLE_DESCRIPTIONS } from '../hooks/useSchoolRoles';
import ParentJoinForm from './ParentJoinForm';
import TeacherJoinForm from './TeacherJoinForm';
import StudentJoinForm from './StudentJoinForm';
import StaffJoinForm from './StaffJoinForm';

/**
 * Modal pour demander à rejoindre une école
 * Affiche les rôles système et personnalisés de l'école
 */
interface SchoolJoinRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  school: {
    id: string;
    name: string;
  };
}

const SchoolJoinRequestModal: React.FC<SchoolJoinRequestModalProps> = ({ 
  isOpen, 
  onClose, 
  school 
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const sendRequest = useSchoolJoinRequest();
  const { data: classes = [] } = useSchoolClasses(school.id);
  const { data: roles = [], isLoading: rolesLoading } = useAssignableRoles(school.id);
  
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  
  // Trouver le rôle sélectionné
  const selectedRole = roles.find(r => r.id === selectedRoleId);
  const roleName = selectedRole?.name || '';
  
  // Préparer la liste des classes disponibles
  const availableClasses = classes.map(cls => ({
    id: cls.id,
    name: cls.name
  }));

  // Obtenir le label traduit pour un rôle
  const getRoleLabel = (role: { name: string; is_system: boolean; description: string | null }) => {
    if (role.is_system && ROLE_LABELS[role.name]) {
      return ROLE_LABELS[role.name];
    }
    return role.name;
  };

  // Obtenir la description pour un rôle
  const getRoleDescription = (role: { name: string; is_system: boolean; description: string | null }) => {
    if (role.description) return role.description;
    if (role.is_system && ROLE_DESCRIPTIONS[role.name]) {
      return ROLE_DESCRIPTIONS[role.name];
    }
    return '';
  };

  const handleParentSubmit = async (data: any) => {
    if (!user?.id || !selectedRoleId) return;
    await sendRequest.mutateAsync({
      schoolId: school.id,
      userId: user.id,
      role: roleName,
      formData: { ...data, roleId: selectedRoleId },
    });
    onClose();
  };

  const handleTeacherSubmit = async (data: any) => {
    if (!user?.id || !selectedRoleId) return;
    await sendRequest.mutateAsync({
      schoolId: school.id,
      userId: user.id,
      role: roleName,
      formData: { ...data, roleId: selectedRoleId },
    });
    onClose();
  };

  const handleStudentSubmit = async (data: any) => {
    if (!user?.id || !selectedRoleId) return;
    await sendRequest.mutateAsync({
      schoolId: school.id,
      userId: user.id,
      role: roleName,
      formData: { ...data, roleId: selectedRoleId },
    });
    onClose();
  };

  const handleStaffSubmit = async (data: any) => {
    if (!user?.id || !selectedRoleId) return;
    await sendRequest.mutateAsync({
      schoolId: school.id,
      userId: user.id,
      role: roleName,
      formData: { ...data, roleId: selectedRoleId },
    });
    onClose();
  };

  if (!isOpen) return null;

  // Grouper les rôles par type
  const systemRoles = roles.filter(r => r.is_system);
  const customRoles = roles.filter(r => !r.is_system);

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/50 z-50 transition-opacity"
        onClick={onClose}
      />

      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md max-h-[90vh] overflow-y-auto bg-background rounded-lg shadow-xl z-50 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">
            {t('school.joinRequest', { defaultValue: 'Demande d\'adhésion' })}
          </h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {school.name}
          </p>

          <div>
            <Label htmlFor="role">{t('school.selectRole', { defaultValue: 'Choisir votre rôle' })} *</Label>
            {rolesLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Select value={selectedRoleId} onValueChange={setSelectedRoleId} required>
                <SelectTrigger id="role">
                  <SelectValue placeholder={t('school.rolePlaceholder', { defaultValue: 'Sélectionner un rôle' })} />
                </SelectTrigger>
                <SelectContent className="z-[60] bg-background">
                  {/* Rôles système */}
                  {systemRoles.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        {t('school.systemRoles', { defaultValue: 'Rôles standards' })}
                      </div>
                      {systemRoles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          <div className="flex flex-col">
                            <span>{getRoleLabel(role)}</span>
                            <span className="text-xs text-muted-foreground">
                              {getRoleDescription(role)}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </>
                  )}
                  
                  {/* Rôles personnalisés de l'école */}
                  {customRoles.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1 pt-2">
                        {t('school.customRoles', { defaultValue: 'Rôles personnalisés' })}
                      </div>
                      {customRoles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          <div className="flex flex-col">
                            <span>{role.name}</span>
                            {role.description && (
                              <span className="text-xs text-muted-foreground">
                                {role.description}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Formulaires spécifiques selon le rôle */}
          {roleName === 'parent' && (
            <div className="pt-4 border-t">
              <ParentJoinForm onSubmit={handleParentSubmit} isPending={sendRequest.isPending} />
            </div>
          )}

          {roleName === 'teacher' && (
            <div className="pt-4 border-t">
              <TeacherJoinForm 
                onSubmit={handleTeacherSubmit} 
                isPending={sendRequest.isPending}
                availableClasses={availableClasses}
              />
            </div>
          )}

          {roleName === 'student' && (
            <div className="pt-4 border-t">
              <StudentJoinForm 
                onSubmit={handleStudentSubmit} 
                isPending={sendRequest.isPending}
                availableClasses={availableClasses}
              />
            </div>
          )}

          {/* Pour les autres rôles (secretary, supervisor, custom roles), utiliser StaffJoinForm */}
          {roleName && !['parent', 'teacher', 'student'].includes(roleName) && (
            <div className="pt-4 border-t">
              <StaffJoinForm onSubmit={handleStaffSubmit} isPending={sendRequest.isPending} />
            </div>
          )}

          {!selectedRoleId && (
            <div className="text-center py-8 text-muted-foreground">
              {t('school.selectRoleFirst', { defaultValue: 'Sélectionnez d\'abord votre rôle' })}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default SchoolJoinRequestModal;
