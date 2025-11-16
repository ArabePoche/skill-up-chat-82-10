// Application de gestion des paiements scolaires
import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, CreditCard } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { useUserSchool, useCurrentSchoolYear } from '@/school/hooks/useSchool';
import { useSchoolClasses } from '@/school/hooks/useClasses';
import { AddPaymentDialog } from './components/AddPaymentDialog';
import { StudentPaymentCard } from './components/StudentPaymentCard';
import { useSchoolStudents } from './hooks/usePayments';

export const PaymentsApp: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  // Récupérer l'utilisateur connecté
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  // Récupérer l'école de l'utilisateur
  const { data: school } = useUserSchool(user?.id);

  // Récupérer l'année scolaire courante
  const { data: schoolYear } = useCurrentSchoolYear(school?.id);

  // Récupérer les classes
  const { data: classes } = useSchoolClasses(school?.id, schoolYear?.id);

  const { data: students, isLoading } = useSchoolStudents(school?.id);

  const filteredStudents = useMemo(() => {
    if (!students) return [];

    return students.filter((student) => {
      const matchesSearch =
        student.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.student_code?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesClass =
        selectedClass === 'all' || student.class_id === selectedClass;

      const matchesStatus =
        selectedStatus === 'all' || 
        (selectedStatus === 'paid' && (student.remaining_amount || 0) === 0) ||
        (selectedStatus === 'partial' && (student.remaining_amount || 0) > 0 && (student.total_amount_paid || 0) > 0) ||
        (selectedStatus === 'unpaid' && (student.total_amount_paid || 0) === 0);

      return matchesSearch && matchesClass && matchesStatus;
    });
  }, [students, searchQuery, selectedClass, selectedStatus]);

  if (!school || !schoolYear) {
    return (
      <div className="p-6 h-full flex items-center justify-center">
        <Card className="p-6">
          <p className="text-muted-foreground">
            Veuillez d'abord créer une école et une année scolaire active.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 h-full overflow-auto">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <CreditCard className="w-6 h-6" />
              Gestion des paiements
            </h1>
            <p className="text-muted-foreground mt-1">
              {filteredStudents.length} élève{filteredStudents.length > 1 ? 's' : ''}
            </p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Ajouter un paiement
          </Button>
        </div>

        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher un élève..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Toutes les classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les classes</SelectItem>
              {classes?.map((classItem) => (
                <SelectItem key={classItem.id} value={classItem.id}>
                  {classItem.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Tous les statuts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="paid">Payé</SelectItem>
              <SelectItem value="partial">Paiement partiel</SelectItem>
              <SelectItem value="unpaid">Non payé</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Chargement...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">Aucun élève trouvé</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStudents.map((student) => (
              <StudentPaymentCard
                key={student.id}
                student={student}
                onAddPayment={() => {
                  setSelectedStudent(student);
                  setIsAddDialogOpen(true);
                }}
              />
            ))}
          </div>
        )}
      </div>

      <AddPaymentDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        schoolId={school.id}
        selectedStudent={selectedStudent}
        onSuccess={() => {
          setSelectedStudent(null);
        }}
      />
    </div>
  );
};
