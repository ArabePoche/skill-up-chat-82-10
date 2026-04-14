/**
 * Vue principale de la comptabilité avec onglets
 * Inclut la détection automatique des dépenses programmées échues
 */
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, List, CalendarClock } from 'lucide-react';
import { Dashboard } from './Dashboard';
import { TransactionsList } from './TransactionsList';
import { ScheduledExpensesList } from './ScheduledExpensesList';
import { ScheduledExpenseConfirmationModal } from './ScheduledExpenseConfirmationModal';
import { useDueScheduledExpenses } from '../hooks/useScheduledExpenses';

interface AccountingViewProps {
  schoolId?: string;
}

export const AccountingView: React.FC<AccountingViewProps> = ({ schoolId }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showDueModal, setShowDueModal] = useState(false);
  const { data: dueExpenses = [] } = useDueScheduledExpenses(schoolId);

  // Afficher automatiquement la modale si des dépenses sont échues
  useEffect(() => {
    if (dueExpenses.length > 0) {
      setShowDueModal(true);
    }
  }, [dueExpenses.length]);

  return (
    <div className="flex flex-col h-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
        <TabsList className="grid w-full md:w-auto grid-cols-3 mb-6 shrink-0">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Tableau de bord</span>
          </TabsTrigger>
          <TabsTrigger value="transactions" className="flex items-center gap-2">
            <List className="w-4 h-4" />
            <span className="hidden sm:inline">Transactions</span>
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="flex items-center gap-2 relative">
            <CalendarClock className="w-4 h-4" />
            <span className="hidden sm:inline">Programmées</span>
            {dueExpenses.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] rounded-full h-4 w-4 flex items-center justify-center">
                {dueExpenses.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="flex-1 overflow-auto mt-0">
          <Dashboard schoolId={schoolId} />
        </TabsContent>

        <TabsContent value="transactions" className="flex-1 overflow-auto mt-0">
          <TransactionsList schoolId={schoolId} />
        </TabsContent>

        <TabsContent value="scheduled" className="flex-1 overflow-auto mt-0">
          <ScheduledExpensesList schoolId={schoolId} />
        </TabsContent>
      </Tabs>

      {/* Modale plein écran de confirmation automatique */}
      <ScheduledExpenseConfirmationModal
        schoolId={schoolId}
        open={showDueModal}
        onOpenChange={setShowDueModal}
      />
    </div>
  );
};
