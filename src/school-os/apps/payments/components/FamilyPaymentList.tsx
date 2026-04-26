/**
 * Liste des paiements par famille
 */
import React, { useState, useMemo } from 'react';
import { useFamiliesWithPayments, type FamilyWithStudents } from '../hooks/useFamilyPayments';
import { FamilyPaymentCard } from './FamilyPaymentCard';
import { FamilyPaymentDialog } from './FamilyPaymentDialog';
import { AddFamilyRegistrationPaymentDialog } from './AddFamilyRegistrationPaymentDialog';
import { Input } from '@/components/ui/input';
import { Search, Users, GraduationCap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { useSchoolYear } from '@/school/context/SchoolYearContext';
import { useSchoolUserRole } from '@/school-os/hooks/useSchoolUserRole';
import { useMonthlyPaymentTracking } from '../hooks/useMonthlyPaymentTracking';

interface FamilyPaymentListProps {
  schoolId?: string;
}

export const FamilyPaymentList: React.FC<FamilyPaymentListProps> = ({ schoolId }) => {
  const { t } = useTranslation();
  const { data: families = [], isLoading, refetch } = useFamiliesWithPayments(schoolId);
  const { trackingData } = useMonthlyPaymentTracking(schoolId);
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

  const trackingByStudentId = useMemo(
    () => new Map(trackingData.map(item => [item.student.id, item.months])),
    [trackingData]
  );

  const monthlyStatusesByFamilyId = useMemo(() => {
    const epsilon = 0.01;

    return new Map(
      families.map((family) => {
        const familyMonthMap = new Map<string, {
          month: string;
          monthLabel: string;
          expectedAmount: number;
          paidAmount: number;
          isPastDue: boolean;
        }>();

        family.students.forEach((student) => {
          const studentMonths = trackingByStudentId.get(student.id) || [];

          studentMonths.forEach((month) => {
            const existingMonth = familyMonthMap.get(month.month);

            if (existingMonth) {
              existingMonth.expectedAmount += month.expectedAmount;
              existingMonth.paidAmount += month.paidAmount;
              existingMonth.isPastDue = existingMonth.isPastDue || month.isPastDue;
              return;
            }

            familyMonthMap.set(month.month, {
              month: month.month,
              monthLabel: month.monthLabel,
              expectedAmount: month.expectedAmount,
              paidAmount: month.paidAmount,
              isPastDue: month.isPastDue,
            });
          });
        });

        const monthlyStatuses = Array.from(familyMonthMap.values())
          .sort((left, right) => left.month.localeCompare(right.month))
          .map((month) => ({
            month: month.month,
            monthLabel: month.monthLabel,
            expectedAmount: month.expectedAmount,
            paidAmount: month.paidAmount,
            isPastDue: month.isPastDue,
            status: (
              month.expectedAmount > 0 && month.paidAmount >= month.expectedAmount - epsilon
                ? 'paid'
                : month.paidAmount > epsilon
                ? 'partial'
                : month.isPastDue
                ? 'late'
                : 'unpaid'
            ) as 'paid' | 'partial' | 'late' | 'unpaid',
          }));

        return [family.family_id, monthlyStatuses];
      })
    );
  }, [families, trackingByStudentId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-2">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="text-sm text-muted-foreground">{t('payments.loading')}</p>
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
              placeholder={t('payments.searchFamilyOrStudent')}
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
              {t('payments.familyRegistration')}
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
                {t('payments.noFamilyFound')}
              </CardContent>
            </Card>
          ) : (
            filteredFamilies.map(family => (
              <FamilyPaymentCard 
                key={family.family_id} 
                family={family} 
                monthlyStatuses={monthlyStatusesByFamilyId.get(family.family_id)}
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
