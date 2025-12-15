/**
 * Vue principale des paiements avec onglets
 */
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreditCard, Calendar, Users } from 'lucide-react';
import { MonthlyPaymentTracking } from './MonthlyPaymentTracking';
import { StudentPaymentList } from './StudentPaymentList';
import { FamilyPaymentList } from './FamilyPaymentList';

interface PaymentsViewProps {
  schoolId?: string;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({ schoolId }) => {
  const [activeTab, setActiveTab] = useState('monthly');

  return (
    <div className="flex flex-col h-full min-h-0">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full min-h-0">
        <TabsList className="grid w-full grid-cols-3 mb-4 sm:mb-6 shrink-0">
          <TabsTrigger value="monthly" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Suivi mensuel</span>
            <span className="sm:hidden">Mensuel</span>
          </TabsTrigger>
          <TabsTrigger value="students" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <CreditCard className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Par élève</span>
            <span className="sm:hidden">Élève</span>
          </TabsTrigger>
          <TabsTrigger value="families" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <Users className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Par famille</span>
            <span className="sm:hidden">Famille</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="monthly" className="flex-1 overflow-hidden mt-0 hidden data-[state=active]:flex data-[state=active]:flex-col">
          <MonthlyPaymentTracking schoolId={schoolId} />
        </TabsContent>

        <TabsContent value="students" className="flex-1 overflow-hidden mt-0 min-h-0 hidden data-[state=active]:flex data-[state=active]:flex-col">
          <StudentPaymentList schoolId={schoolId} />
        </TabsContent>

        <TabsContent value="families" className="flex-1 overflow-hidden mt-0 hidden data-[state=active]:flex data-[state=active]:flex-col">
          <FamilyPaymentList schoolId={schoolId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
