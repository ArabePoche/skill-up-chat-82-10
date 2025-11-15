// Sélecteur pour lier un élève à une famille
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFamilies, useLinkStudentToFamily } from '../hooks/useFamilies';
import { Label } from '@/components/ui/label';

interface StudentFamilySelectorProps {
  studentId: string;
  schoolId: string;
  currentFamilyId?: string | null;
}

export const StudentFamilySelector: React.FC<StudentFamilySelectorProps> = ({
  studentId,
  schoolId,
  currentFamilyId,
}) => {
  const { data: families, isLoading } = useFamilies(schoolId);
  const linkMutation = useLinkStudentToFamily();

  const handleChange = (value: string) => {
    const familyId = value === 'none' ? null : value;
    linkMutation.mutate({ studentId, familyId });
  };

  return (
    <div className="space-y-2">
      <Label>Famille</Label>
      <Select
        value={currentFamilyId || 'none'}
        onValueChange={handleChange}
        disabled={isLoading || linkMutation.isPending}
      >
        <SelectTrigger>
          <SelectValue placeholder="Sélectionner une famille" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Aucune famille</SelectItem>
          {families?.map((family) => {
            const displayName = [
              family.family_name,
              family.primary_contact_name && `(${family.primary_contact_name})`,
              family.primary_contact_phone && `📱 ${family.primary_contact_phone}`,
            ]
              .filter(Boolean)
              .join(' ');
            
            return (
              <SelectItem key={family.id} value={family.id}>
                {displayName}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
};
