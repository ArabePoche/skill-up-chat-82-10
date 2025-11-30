/**
 * Section de sélection des surveillants
 */
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSchoolYear } from '@/school/context/SchoolYearContext';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';

interface SupervisorsSectionProps {
  selectedSupervisors: string[];
  onSupervisorsChange: (supervisors: string[]) => void;
}

export const SupervisorsSection: React.FC<SupervisorsSectionProps> = ({
  selectedSupervisors,
  onSupervisorsChange,
}) => {
  const { school } = useSchoolYear();
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // Récupérer tous les membres du staff (teachers, supervisors, personnel)
  const { data: staff = [] } = useQuery({
    queryKey: ['school-staff', school?.id],
    queryFn: async () => {
      if (!school?.id) return [];

      const { data, error } = await supabase
        .from('school_user_roles')
        .select(`
          user_id,
          profiles:user_id (
            id,
            first_name,
            last_name
          ),
          school_roles (
            name
          )
        `)
        .eq('school_id', school.id)
        .in('school_roles.name', ['teacher', 'supervisor', 'secretary']);

      if (error) throw error;
      return data || [];
    },
    enabled: !!school?.id,
  });

  const filteredStaff = staff.filter((member: any) =>
    `${member.profiles?.first_name} ${member.profiles?.last_name}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const handleToggle = (userId: string) => {
    if (selectedSupervisors.includes(userId)) {
      onSupervisorsChange(selectedSupervisors.filter((id) => id !== userId));
    } else {
      onSupervisorsChange([...selectedSupervisors, userId]);
    }
  };

  const selectedStaff = staff.filter((member: any) =>
    selectedSupervisors.includes(member.user_id)
  );

  return (
    <div className="space-y-3">
      <h4 className="font-medium text-foreground">Surveillants (optionnel)</h4>

      {selectedStaff.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedStaff.map((member: any) => (
            <Badge key={member.user_id} variant="secondary" className="gap-2">
              {member.profiles?.first_name} {member.profiles?.last_name}
              <button
                type="button"
                onClick={() => handleToggle(member.user_id)}
                className="hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="w-full">
            <Search className="h-4 w-4 mr-2" />
            {isOpen ? 'Masquer la recherche' : 'Ajouter des surveillants'}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-3 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un surveillant..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="border border-border rounded-md p-2 max-h-60 overflow-y-auto">
            {filteredStaff.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-2">Aucun membre trouvé</p>
            ) : (
              <div className="space-y-1">
                {filteredStaff.map((member: any) => {
                  const isSelected = selectedSupervisors.includes(member.user_id);
                  return (
                    <div
                      key={member.user_id}
                      className="flex items-center justify-between p-2 hover:bg-muted/50 rounded cursor-pointer"
                      onClick={() => handleToggle(member.user_id)}
                    >
                      <span className="text-sm">
                        {member.profiles?.first_name} {member.profiles?.last_name}
                        <span className="text-xs text-muted-foreground ml-2">
                          ({member.school_roles?.name})
                        </span>
                      </span>
                      <Button
                        type="button"
                        variant={isSelected ? 'default' : 'outline'}
                        size="sm"
                      >
                        {isSelected ? 'Retirer' : 'Ajouter'}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
