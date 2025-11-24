/**
 * Vue principale des enseignants avec onglets
 */
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Wallet, MessageSquare, UserX, Clock } from 'lucide-react';
import { TeachersList } from './TeachersList';
import { TeacherPayments } from './TeacherPayments';
import { TeacherRemarks } from './TeacherRemarks';
import { TeacherAbsences } from './TeacherAbsences';
import { TeacherLateArrivals } from './TeacherLateArrivals';

interface TeachersViewProps {
  schoolId?: string;
}

export const TeachersView: React.FC<TeachersViewProps> = ({ schoolId }) => {
  const [activeTab, setActiveTab] = useState('list');

  return (
    <div className="flex flex-col h-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
        <TabsList className="grid w-full grid-cols-5 mb-4 sm:mb-6 shrink-0">
          <TabsTrigger value="list" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <Users className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Enseignants</span>
            <span className="sm:hidden">Liste</span>
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <Wallet className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Paiements</span>
            <span className="sm:hidden">€</span>
          </TabsTrigger>
          <TabsTrigger value="remarks" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Remarques</span>
            <span className="sm:hidden">Notes</span>
          </TabsTrigger>
          <TabsTrigger value="absences" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <UserX className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Absences</span>
            <span className="sm:hidden">Abs.</span>
          </TabsTrigger>
          <TabsTrigger value="late" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Retards</span>
            <span className="sm:hidden">Ret.</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="flex-1 overflow-hidden mt-0 hidden data-[state=active]:flex data-[state=active]:flex-col">
          <TeachersList schoolId={schoolId} />
        </TabsContent>

        <TabsContent value="payments" className="flex-1 overflow-hidden mt-0 hidden data-[state=active]:flex data-[state=active]:flex-col">
          <TeacherPayments schoolId={schoolId} />
        </TabsContent>

        <TabsContent value="remarks" className="flex-1 overflow-hidden mt-0 hidden data-[state=active]:flex data-[state=active]:flex-col">
          <TeacherRemarks schoolId={schoolId} />
        </TabsContent>

        <TabsContent value="absences" className="flex-1 overflow-hidden mt-0 hidden data-[state=active]:flex data-[state=active]:flex-col">
          <TeacherAbsences schoolId={schoolId} />
        </TabsContent>

        <TabsContent value="late" className="flex-1 overflow-hidden mt-0 hidden data-[state=active]:flex data-[state=active]:flex-col">
          <TeacherLateArrivals schoolId={schoolId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
