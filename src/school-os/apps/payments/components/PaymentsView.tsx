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
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full md:w-auto grid-cols-3 mb-6">
          <TabsTrigger value="monthly" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">Suivi mensuel</span>
          </TabsTrigger>
          <TabsTrigger value="students" className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            <span className="hidden sm:inline">Par élève</span>
          </TabsTrigger>
          <TabsTrigger value="families" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Par famille</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="monthly">
          <MonthlyPaymentTracking schoolId={schoolId} />
        </TabsContent>

        <TabsContent value="students">
          <StudentPaymentList schoolId={schoolId} />
        </TabsContent>

        <TabsContent value="families">
          <FamilyPaymentList schoolId={schoolId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
