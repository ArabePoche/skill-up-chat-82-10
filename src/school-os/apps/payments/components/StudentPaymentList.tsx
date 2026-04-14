/**
 * Liste des paiements par élève (vue existante)
 */
import React, { useState, useMemo } from 'react';
import { useSchoolStudents } from '../hooks/usePayments';
import { useMonthlyPaymentTracking } from '../hooks/useMonthlyPaymentTracking';
import { StudentPaymentCard } from './StudentPaymentCard';
import { AddPaymentDialog } from './AddPaymentDialog';
import { AddRegistrationPaymentDialog } from './AddRegistrationPaymentDialog';
import { Input } from '@/components/ui/input';
import { Search, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface StudentPaymentListProps {
  schoolId?: string;
}

export const StudentPaymentList: React.FC<StudentPaymentListProps> = ({ schoolId }) => {
  const { data: students = [], isLoading } = useSchoolStudents(schoolId);
  const { trackingData } = useMonthlyPaymentTracking(schoolId);
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'up_to_date' | 'partial' | 'late'>('all');
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [isAddRegistrationPaymentOpen, setIsAddRegistrationPaymentOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  const studentsWithDebt = students.filter(student => student.total_amount_due > 0);

  const classOptions = useMemo(() => {
    const classes = studentsWithDebt
      .map(student => ({
        id: student.class_id,
        name: student.classes?.name || 'Sans classe',
      }))
      .filter((classInfo): classInfo is { id: string; name: string } => !!classInfo.id);

    return Array.from(new Map(classes.map(classInfo => [classInfo.id, classInfo])).values())
      .sort((left, right) => left.name.localeCompare(right.name, 'fr'));
  }, [studentsWithDebt]);

  // Statistiques basées sur le statut du mois précédent (calculé par useMonthlyPaymentTracking)
  const stats = useMemo(() => {
    const upToDate = trackingData.filter(t => t.overallStatus === 'up_to_date').length;
    const partial = trackingData.filter(t => t.overallStatus === 'partial').length;
    const late = trackingData.filter(t => t.overallStatus === 'late').length;
    return { upToDate, partial, late };
  }, [trackingData]);

  const filteredStudents = studentsWithDebt.filter(student => {
    const query = searchQuery.toLowerCase();
    const studentTracking = trackingData.find(t => t.student.id === student.id);
    const matchesStatus = statusFilter === 'all' || studentTracking?.overallStatus === statusFilter;
    const matchesClass = classFilter === 'all' || student.class_id === classFilter;

    return (
      matchesStatus && matchesClass && (
        `${student.first_name} ${student.last_name}`.toLowerCase().includes(query) ||
        student.student_code?.toLowerCase().includes(query)
      )
    );
  });

  const toggleStatusFilter = (nextFilter: 'up_to_date' | 'partial' | 'late') => {
    setStatusFilter((currentFilter) => currentFilter === nextFilter ? 'all' : nextFilter);
  };

  const getEmptyStateMessage = () => {
    if (statusFilter === 'up_to_date') {
      return 'Aucun élève à jour pour ce filtre.';
    }
    if (statusFilter === 'partial') {
      return 'Aucun élève en paiement partiel pour ce filtre.';
    }
    if (statusFilter === 'late') {
      return 'Aucun élève en retard pour ce filtre.';
    }
    return 'Aucun élève trouvé.';
  };

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
    <div className="flex flex-col h-full min-h-0">
      {/* Statistiques minimales */}
      <div className="flex flex-wrap gap-2 justify-center mb-3 shrink-0">
        <Badge
          variant="outline"
          className={`flex items-center gap-1 px-3 py-1 cursor-pointer transition-colors ${
            statusFilter === 'up_to_date'
              ? 'bg-green-600 text-white border-green-600'
              : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
          }`}
          onClick={() => toggleStatusFilter('up_to_date')}
        >
          <CheckCircle2 className="w-3 h-3" />
          <span className="text-xs font-medium">{stats.upToDate} à jour</span>
        </Badge>
        <Badge
          variant="outline"
          className={`flex items-center gap-1 px-3 py-1 cursor-pointer transition-colors ${
            statusFilter === 'partial'
              ? 'bg-yellow-500 text-white border-yellow-500'
              : 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100'
          }`}
          onClick={() => toggleStatusFilter('partial')}
        >
          <Clock className="w-3 h-3" />
          <span className="text-xs font-medium">{stats.partial} partiels</span>
        </Badge>
        <Badge
          variant="outline"
          className={`flex items-center gap-1 px-3 py-1 cursor-pointer transition-colors ${
            statusFilter === 'late'
              ? 'bg-red-600 text-white border-red-600'
              : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
          }`}
          onClick={() => toggleStatusFilter('late')}
        >
          <AlertCircle className="w-3 h-3" />
          <span className="text-xs font-medium">{stats.late} en retard</span>
        </Badge>
      </div>

      {/* Barre de recherche style Google - FIXE */}
      <div className="flex flex-col gap-3 mb-4 sm:mb-6 shrink-0">
        <div className="w-full max-w-5xl mx-auto flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
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
          <div className="w-full lg:w-64">
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="h-12 rounded-full border-2 px-4 shadow-sm">
                <SelectValue placeholder="Toutes les classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les classes</SelectItem>
                {classOptions.map(classOption => (
                  <SelectItem key={classOption.id} value={classOption.id}>
                    {classOption.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {(statusFilter !== 'all' || classFilter !== 'all') && (
          <p className="text-sm text-center text-muted-foreground">
            Filtre actif : {[
              statusFilter !== 'all'
                ? (statusFilter === 'up_to_date' ? 'élèves à jour' : statusFilter === 'partial' ? 'élèves partiels' : 'élèves en retard')
                : null,
              classFilter !== 'all'
                ? `classe ${classOptions.find(classOption => classOption.id === classFilter)?.name || ''}`
                : null,
            ].filter(Boolean).join(' • ')}
          </p>
        )}
      </div>

      {/* Liste des élèves - SCROLLABLE */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 pr-2 sm:pr-4 pb-16">
          {filteredStudents.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="py-8 text-center text-muted-foreground">
                {getEmptyStateMessage()}
              </CardContent>
            </Card>
          ) : (
            filteredStudents.map(student => {
              const studentTracking = trackingData.find(t => t.student.id === student.id);
              return (
                <StudentPaymentCard 
                  key={student.id} 
                  student={student}
                  monthlyStatuses={studentTracking?.months}
                  onAddPayment={() => {
                    setSelectedStudent(student);
                    setIsAddPaymentOpen(true);
                  }}
                  onAddRegistrationPayment={() => {
                    setSelectedStudent(student);
                    setIsAddRegistrationPaymentOpen(true);
                  }}
                />
              );
            })
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
