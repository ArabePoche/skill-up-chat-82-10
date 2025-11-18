/**
 * Liste des paiements par famille (vue existante)
 */
import React, { useState } from 'react';
import { useFamiliesWithPayments, type FamilyWithStudents } from '../hooks/useFamilyPayments';
import { FamilyPaymentCard } from './FamilyPaymentCard';
import { FamilyPaymentDialog } from './FamilyPaymentDialog';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface FamilyPaymentListProps {
  schoolId?: string;
}

export const FamilyPaymentList: React.FC<FamilyPaymentListProps> = ({ schoolId }) => {
  const { data: families = [], isLoading, refetch } = useFamiliesWithPayments(schoolId);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
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
      {/* Barre de recherche - FIXE */}
      <div className="relative mb-6 shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher une famille..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Liste des familles - SCROLLABLE */}
      <ScrollArea className="flex-1">
        <div className="space-y-4 pr-4">
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
              />
            ))
          )}
        </div>
      </ScrollArea>

      {schoolId && (
        <FamilyPaymentDialog
          open={isDialogOpen}
          onOpenChange={handleDialogClose}
          schoolId={schoolId}
          selectedFamily={selectedFamily}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
};
