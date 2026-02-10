/**
 * Liste des paiements par famille (vue existante)
 */
import React, { useState } from 'react';
import { useFamiliesWithPayments, type FamilyWithStudents } from '../hooks/useFamilyPayments';
import { FamilyPaymentCard } from './FamilyPaymentCard';
import { FamilyPaymentDialog } from './FamilyPaymentDialog';
import { AddFamilyRegistrationPaymentDialog } from './AddFamilyRegistrationPaymentDialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, GraduationCap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSchoolYear } from '@/school/context/SchoolYearContext';
import { useSchoolUserRole } from '@/school-os/hooks/useSchoolUserRole';

interface FamilyPaymentListProps {
  schoolId?: string;
}

export const FamilyPaymentList: React.FC<FamilyPaymentListProps> = ({ schoolId }) => {
  const { data: families = [], isLoading, refetch } = useFamiliesWithPayments(schoolId);
  const { school } = useSchoolYear();
  const { data: roleData } = useSchoolUserRole(school?.id);
  const isParent = roleData?.isParent || false;
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRegistrationDialogOpen, setIsRegistrationDialogOpen] = useState(false);
  const [selectedFamily, setSelectedFamily] = useState<FamilyWithStudents | undefined>();

  const handleAddPayment = (family: FamilyWithStudents) => {
    setSelectedFamily(family);
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setSelectedFamily(undefined);
  };

  const handlePaymentSuccess = () => {
    refetch();
  };

  const filteredFamilies = families.filter(family => {
    const query = searchQuery.toLowerCase();
    return (
      family.family_name.toLowerCase().includes(query) ||
      family.students.some(student => 
        `${student.first_name} ${student.last_name}`.toLowerCase().includes(query)
      )
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-2">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="text-sm text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Barre de recherche style Google - FIXE */}
      <div className="flex flex-col gap-3 mb-4 sm:mb-6 shrink-0">
        <div className="relative w-full max-w-3xl mx-auto">
          <div className="relative flex items-center">
            <Search className="absolute left-4 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Rechercher une famille ou un élève..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-4 h-12 text-base rounded-full border-2 focus:border-primary shadow-sm hover:shadow-md transition-shadow"
            />
          </div>
        </div>
        
        {!isParent && (
          <div className="flex justify-center">
            <Button 
              onClick={() => setIsRegistrationDialogOpen(true)} 
              variant="outline"
              className="rounded-full border-2"
            >
              <GraduationCap className="w-4 h-4 mr-2" />
              Frais d'inscription familial
            </Button>
          </div>
        )}
      </div>

      {/* Liste des familles - SCROLLABLE */}
      <ScrollArea className="flex-1">
        <div className="space-y-3 sm:space-y-4 pr-2 sm:pr-4">
          {filteredFamilies.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Aucune famille trouvée.
              </CardContent>
            </Card>
          ) : (
            filteredFamilies.map(family => (
              <FamilyPaymentCard 
                key={family.family_id} 
                family={family} 
                onAddPayment={() => handleAddPayment(family)}
                onAddRegistrationPayment={() => {
                  setSelectedFamily(family);
                  setIsRegistrationDialogOpen(true);
                }}
                hidePaymentActions={isParent}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {schoolId && (
        <>
          <FamilyPaymentDialog
            open={isDialogOpen}
            onOpenChange={handleDialogClose}
            schoolId={schoolId}
            selectedFamily={selectedFamily}
            onSuccess={handlePaymentSuccess}
          />
          
          <AddFamilyRegistrationPaymentDialog
            open={isRegistrationDialogOpen}
            onOpenChange={(open) => {
              setIsRegistrationDialogOpen(open);
              if (!open) setSelectedFamily(undefined);
            }}
            schoolId={schoolId}
            selectedFamily={selectedFamily}
            onSuccess={handlePaymentSuccess}
          />
        </>
      )}
    </div>
  );
};
