import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useTranslation } from 'react-i18next';
import { useSchoolJoinRequest } from '../hooks/useSchoolJoinRequest';
import { useAuth } from '@/hooks/useAuth';
import { useSchoolClasses } from '../hooks/useClasses';
import ParentJoinForm from './ParentJoinForm';
import TeacherJoinForm from './TeacherJoinForm';
import StudentJoinForm from './StudentJoinForm';
import StaffJoinForm from './StaffJoinForm';

/**
 * Modal pour demander à rejoindre une école
 * Formulaires complets selon le rôle choisi
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
  
  const [role, setRole] = useState<string>('');
  
  // Préparer la liste des classes disponibles
  const availableClasses = classes.map(cls => ({
    id: cls.id,
    name: cls.name
  }));

  const handleParentSubmit = async (data: any) => {
    if (!user?.id) return;
    await sendRequest.mutateAsync({
      schoolId: school.id,
      userId: user.id,
      role: 'parent',
      formData: data,
    });
    onClose();
  };

  const handleTeacherSubmit = async (data: any) => {
    if (!user?.id) return;
    await sendRequest.mutateAsync({
      schoolId: school.id,
      userId: user.id,
      role: 'teacher',
      formData: data,
    });
    onClose();
  };

  const handleStudentSubmit = async (data: any) => {
    if (!user?.id) return;
    await sendRequest.mutateAsync({
      schoolId: school.id,
      userId: user.id,
      role: 'student',
      formData: data,
    });
    onClose();
  };

  const handleStaffSubmit = async (data: any) => {
    if (!user?.id) return;
    await sendRequest.mutateAsync({
      schoolId: school.id,
      userId: user.id,
      role: 'staff',
      formData: data,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/50 z-50 transition-opacity"
        onClick={onClose}
      />

      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-background rounded-lg shadow-xl z-50 p-6">
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
            <Select value={role} onValueChange={setRole} required>
              <SelectTrigger id="role">
                <SelectValue placeholder={t('school.rolePlaceholder', { defaultValue: 'Sélectionner un rôle' })} />
              </SelectTrigger>
              <SelectContent className="z-[60] bg-background">
                <SelectItem value="student">
                  {t('school.roleStudent', { defaultValue: 'Élève' })}
                </SelectItem>
                <SelectItem value="parent">
                  {t('school.roleParent', { defaultValue: 'Parent' })}
                </SelectItem>
                <SelectItem value="teacher">
                  {t('school.roleTeacher', { defaultValue: 'Enseignant' })}
                </SelectItem>
                <SelectItem value="staff">
                  {t('school.roleStaff', { defaultValue: 'Personnel' })}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {role === 'parent' && (
            <div className="pt-4 border-t">
              <ParentJoinForm onSubmit={handleParentSubmit} isPending={sendRequest.isPending} />
            </div>
          )}

          {role === 'teacher' && (
            <div className="pt-4 border-t">
              <TeacherJoinForm 
                onSubmit={handleTeacherSubmit} 
                isPending={sendRequest.isPending}
                availableClasses={availableClasses}
              />
            </div>
          )}

          {role === 'student' && (
            <div className="pt-4 border-t">
              <StudentJoinForm 
                onSubmit={handleStudentSubmit} 
                isPending={sendRequest.isPending}
                availableClasses={availableClasses}
              />
            </div>
          )}

          {role === 'staff' && (
            <div className="pt-4 border-t">
              <StaffJoinForm onSubmit={handleStaffSubmit} isPending={sendRequest.isPending} />
            </div>
          )}

          {!role && (
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
