/**
 * Liste des paiements par élève (vue existante)
 */
import React, { useState } from 'react';
import { useSchoolStudents } from '../hooks/usePayments';
import { StudentPaymentCard } from './StudentPaymentCard';
import { AddPaymentDialog } from './AddPaymentDialog';
import { AddRegistrationPaymentDialog } from './AddRegistrationPaymentDialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus, GraduationCap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface StudentPaymentListProps {
  schoolId?: string;
}

export const StudentPaymentList: React.FC<StudentPaymentListProps> = ({ schoolId }) => {
  const { data: students = [], isLoading } = useSchoolStudents(schoolId);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [isAddRegistrationPaymentOpen, setIsAddRegistrationPaymentOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  const filteredStudents = students
    .filter(student => student.total_amount_due > 0) // Exclure les élèves avec montant dû = 0
    .filter(student => {
      const query = searchQuery.toLowerCase();
      return (
        `${student.first_name} ${student.last_name}`.toLowerCase().includes(query) ||
        student.student_code?.toLowerCase().includes(query)
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
              placeholder="Rechercher un élève par nom ou code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-4 h-12 text-base rounded-full border-2 focus:border-primary shadow-sm hover:shadow-md transition-shadow"
            />
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 justify-center">
          <Button onClick={() => setIsAddPaymentOpen(true)} className="rounded-full">
            <Plus className="w-4 h-4 mr-2" />
            Paiement scolaire
          </Button>
          <Button 
            onClick={() => setIsAddRegistrationPaymentOpen(true)} 
            variant="outline"
            className="rounded-full border-2"
          >
            <GraduationCap className="w-4 h-4 mr-2" />
            Frais d'inscription
          </Button>
        </div>
      </div>

      {/* Liste des élèves - SCROLLABLE */}
      <ScrollArea className="flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 pr-2 sm:pr-4">
          {filteredStudents.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="py-8 text-center text-muted-foreground">
                Aucun élève trouvé.
              </CardContent>
            </Card>
          ) : (
            filteredStudents.map(student => (
              <StudentPaymentCard 
                key={student.id} 
                student={student}
                onAddPayment={() => {
                  setSelectedStudent(student);
                  setIsAddPaymentOpen(true);
                }}
                onAddRegistrationPayment={() => {
                  setSelectedStudent(student);
                  setIsAddRegistrationPaymentOpen(true);
                }}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Dialog d'ajout de paiement scolaire */}
      <AddPaymentDialog
        open={isAddPaymentOpen}
        onOpenChange={(open) => {
          setIsAddPaymentOpen(open);
          if (!open) setSelectedStudent(null);
        }}
        schoolId={schoolId || ''}
        selectedStudent={selectedStudent}
        onSuccess={() => {}}
      />

      {/* Dialog d'ajout de paiement de frais d'inscription */}
      <AddRegistrationPaymentDialog
        open={isAddRegistrationPaymentOpen}
        onOpenChange={(open) => {
          setIsAddRegistrationPaymentOpen(open);
          if (!open) setSelectedStudent(null);
        }}
        schoolId={schoolId || ''}
        selectedStudent={selectedStudent}
        onSuccess={() => {}}
      />
    </div>
  );
};
