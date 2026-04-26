/**
 * Vue principale des paiements avec onglets
 * Réorganisée autour des vues prioritaires: par élève, par famille et statistiques.
 */
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Users, User } from 'lucide-react';
import { FamilyPaymentList } from './FamilyPaymentList';
import { StudentPaymentList } from './StudentPaymentList';
import { PaymentStatisticsView } from './PaymentStatisticsView';
import { useSchoolUserRole } from '@/school-os/hooks/useSchoolUserRole';
import { useSchoolYear } from '@/school/context/SchoolYearContext';
import { useTranslation } from 'react-i18next';

interface PaymentsViewProps {
  schoolId?: string;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({ schoolId }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('students');
  const { school } = useSchoolYear();
  const { data: roleData } = useSchoolUserRole(school?.id);
  const isParent = roleData?.isParent && !roleData?.isAdmin && !roleData?.isOwner;

  const tabCount = isParent ? 2 : 3;
  const tabsListClassName = tabCount === 3 ? 'grid w-full grid-cols-3 mb-4 sm:mb-6 shrink-0' : 'grid w-full grid-cols-2 mb-4 sm:mb-6 shrink-0';

  return (
    <div className="flex flex-col h-full min-h-0">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full min-h-0">
        <TabsList className={tabsListClassName}>
          {!isParent && (
            <TabsTrigger value="students" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <User className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">{t('payments.byStudent')}</span>
              <span className="sm:hidden">{t('payments.student')}</span>
            </TabsTrigger>
          )}
          <TabsTrigger value="families" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <Users className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">{t('payments.byFamily')}</span>
            <span className="sm:hidden">{t('payments.family')}</span>
          </TabsTrigger>
          <TabsTrigger value="statistics" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">{t('payments.statistics')}</span>
            <span className="sm:hidden">{t('payments.statistics')}</span>
          </TabsTrigger>
        </TabsList>

        {!isParent && (
          <TabsContent value="students" className="flex-1 overflow-hidden mt-0 hidden data-[state=active]:flex data-[state=active]:flex-col">
            <StudentPaymentList schoolId={schoolId} />
          </TabsContent>
        )}

        <TabsContent value="families" className="flex-1 overflow-hidden mt-0 hidden data-[state=active]:flex data-[state=active]:flex-col">
          <FamilyPaymentList schoolId={schoolId} />
        </TabsContent>

        <TabsContent value="statistics" className="flex-1 overflow-hidden mt-0 hidden data-[state=active]:flex data-[state=active]:flex-col">
          <PaymentStatisticsView schoolId={schoolId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
