/**
 * Vue principale de la comptabilité avec onglets
 */
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, List } from 'lucide-react';
import { Dashboard } from './Dashboard';
import { TransactionsList } from './TransactionsList';

interface AccountingViewProps {
  schoolId?: string;
}

export const AccountingView: React.FC<AccountingViewProps> = ({ schoolId }) => {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="flex flex-col h-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
        <TabsList className="grid w-full md:w-auto grid-cols-2 mb-6 shrink-0">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Tableau de bord</span>
          </TabsTrigger>
          <TabsTrigger value="transactions" className="flex items-center gap-2">
            <List className="w-4 h-4" />
            <span className="hidden sm:inline">Transactions</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="flex-1 overflow-auto mt-0">
          <Dashboard schoolId={schoolId} />
        </TabsContent>

        <TabsContent value="transactions" className="flex-1 overflow-auto mt-0">
          <TransactionsList schoolId={schoolId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
