/**
 * Liste des paiements par élève (vue existante)
 */
import React, { useState } from 'react';
import { useSchoolStudents } from '../hooks/usePayments';
import { StudentPaymentCard } from './StudentPaymentCard';
import { AddPaymentDialog } from './AddPaymentDialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface StudentPaymentListProps {
  schoolId?: string;
}

export const StudentPaymentList: React.FC<StudentPaymentListProps> = ({ schoolId }) => {
  const { data: students = [], isLoading } = useSchoolStudents(schoolId);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  const filteredStudents = students.filter(student => {
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
    <div className="space-y-6">
      {/* Barre de recherche et actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un élève..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setIsAddPaymentOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Ajouter un paiement
        </Button>
      </div>

      {/* Liste des élèves */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
            />
          ))
        )}
      </div>

      {/* Dialog d'ajout de paiement */}
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
    </div>
  );
};
