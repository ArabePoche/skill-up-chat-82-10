 // Panneau affichant les demandes de transfert entrantes et sortantes
 import React, { useState } from 'react';
 import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
 import { Badge } from '@/components/ui/badge';
 import { ScrollArea } from '@/components/ui/scroll-area';
 import { Loader2, ArrowDownLeft, ArrowUpRight, Inbox } from 'lucide-react';
 import { useSchoolYear } from '@/school/context/SchoolYearContext';
 import {
  useIncomingTransferRequests,
   useOutgoingTransferRequests,
 } from '../hooks/useTransfertRequest';
  import { TransferRequestCard } from './TransfertRequestCard';
  
  export const TransfertRequestsPanel: React.FC = () => {
   const { school } = useSchoolYear();
   const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing'>('incoming');
 
   const { data: incomingRequests = [], isLoading: loadingIncoming } = useIncomingTransferRequests(school?.id);
   const { data: outgoingRequests = [], isLoading: loadingOutgoing } = useOutgoingTransferRequests(school?.id);
 
   const pendingIncomingCount = incomingRequests.filter(r => r.status === 'pending').length;
   const pendingOutgoingCount = outgoingRequests.filter(r => r.status === 'pending').length;
 
   return (
     <div className="space-y-4">
       <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'incoming' | 'outgoing')}>
         <TabsList className="grid w-full grid-cols-2">
           <TabsTrigger value="incoming" className="flex items-center gap-2">
             <ArrowDownLeft className="w-4 h-4" />
             Demandes reçues
             {pendingIncomingCount > 0 && (
               <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                 {pendingIncomingCount}
               </Badge>
             )}
           </TabsTrigger>
           <TabsTrigger value="outgoing" className="flex items-center gap-2">
             <ArrowUpRight className="w-4 h-4" />
             Demandes envoyées
             {pendingOutgoingCount > 0 && (
               <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                 {pendingOutgoingCount}
               </Badge>
             )}
           </TabsTrigger>
         </TabsList>
 
         <TabsContent value="incoming" className="mt-4">
           {loadingIncoming ? (
             <div className="flex items-center justify-center py-8">
               <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
             </div>
           ) : incomingRequests.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
               <Inbox className="w-12 h-12 mb-3 opacity-50" />
               <p>Aucune demande de transfert reçue</p>
             </div>
           ) : (
             <ScrollArea className="h-[500px]">
               <div className="space-y-3 pr-4">
                {incomingRequests.map((request) => (
                   <TransferRequestCard key={request.id} request={request} />
                 ))}
              </div>
             </ScrollArea>
           )}
         </TabsContent>
 
         <TabsContent value="outgoing" className="mt-4">
           {loadingOutgoing ? (
             <div className="flex items-center justify-center py-8">
               <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
             </div>
           ) : outgoingRequests.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
               <Inbox className="w-12 h-12 mb-3 opacity-50" />
               <p>Aucune demande de transfert envoyée</p>
             </div>
           ) : (
             <ScrollArea className="h-[500px]">
               <div className="space-y-3 pr-4">
                {outgoingRequests.map((request) => (
                   <TransferRequestCard key={request.id} request={request} />
                 ))}
              </div>
             </ScrollArea>
           )}
         </TabsContent>
       </Tabs>
     </div>
   );
 };