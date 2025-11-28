// Application de messagerie pour l'école - Unifiée pour tous les rôles
import React, { useState } from 'react';
import { useSchoolMessages } from './hooks/useSchoolMessages';
import { JoinRequestCard } from './components/JoinRequestCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Inbox, UserPlus, Users, MessageSquare, Mail } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSchoolYear } from '@/school/context/SchoolYearContext';
import { useSchoolUserRole } from '@/school-os/hooks/useSchoolUserRole';

export const MessagesApp: React.FC = () => {
  const { user } = useAuth();
  const { school } = useSchoolYear();
  const { data: roleData, isLoading: isLoadingRole } = useSchoolUserRole(school?.id);
  const isTeacher = roleData?.isTeacher ?? false;
  const isOwner = roleData?.isOwner ?? false;
  
  const [activeTab, setActiveTab] = useState(isTeacher ? 'admin' : 'join-requests');
  
  const {
    joinRequests,
    isLoading,
    approveRequest,
    rejectRequest,
    isApproving,
    isRejecting,
  } = useSchoolMessages(school?.id);

  const pendingRequests = joinRequests.filter((req) => req.status === 'pending');
  const processedRequests = joinRequests.filter((req) => req.status !== 'pending');

  // Handlers simplifiés
  const handleApprove = (requestId: string) => {
    approveRequest({ requestId });
  };

  const handleReject = (requestId: string, reason?: string) => {
    rejectRequest({ requestId, reason });
  };

  if (!school) {
    return (
      <div className="p-6 h-full flex items-center justify-center">
        <p className="text-muted-foreground">Aucune école sélectionnée</p>
      </div>
    );
  }

  if (isLoadingRole) {
    return (
      <div className="p-6 h-full flex items-center justify-center">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  // Vue enseignant : Messages avec administration et parents
  if (isTeacher) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-6 border-b flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Messages</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Communiquez avec l'administration et les parents
              </p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="admin" className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 pt-4 flex-shrink-0">
            <TabsList>
              <TabsTrigger value="admin" className="gap-2">
                <Inbox className="h-4 w-4" />
                Administration
              </TabsTrigger>
              <TabsTrigger value="parents" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                Parents
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="admin" className="flex-1 mt-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-6">
                <div className="text-center py-12">
                  <div className="inline-flex p-4 rounded-full bg-muted mb-4">
                    <Inbox className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Messages administratifs</h3>
                  <p className="text-sm text-muted-foreground">
                    Les messages de l'administration apparaîtront ici
                  </p>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="parents" className="flex-1 mt-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-6">
                <div className="text-center py-12">
                  <div className="inline-flex p-4 rounded-full bg-muted mb-4">
                    <MessageSquare className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Messages des parents</h3>
                  <p className="text-sm text-muted-foreground">
                    Les messages des parents de vos élèves apparaîtront ici
                  </p>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Vue propriétaire/administrateur : Demandes d'adhésion et messages
  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Inbox className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Messages</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Gérez les demandes et communiquez avec votre école
            </p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="px-6 pt-4">
          <TabsList>
            <TabsTrigger value="join-requests" className="gap-2">
              <UserPlus className="h-4 w-4" />
              Demandes d'adhésion
              {pendingRequests.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {pendingRequests.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="teachers" className="gap-2">
              <Users className="h-4 w-4" />
              Enseignants
            </TabsTrigger>
            <TabsTrigger value="parents" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Parents
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="join-requests" className="flex-1 mt-0">
          <ScrollArea className="h-full">
            <div className="p-6 space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : pendingRequests.length === 0 ? (
                <div className="text-center py-12">
                  <div className="inline-flex p-4 rounded-full bg-muted mb-4">
                    <UserPlus className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Aucune demande en attente</h3>
                  <p className="text-sm text-muted-foreground">
                    Les nouvelles demandes d'adhésion apparaîtront ici
                  </p>
                </div>
              ) : (
                <>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    En attente ({pendingRequests.length})
                  </h3>
                  {pendingRequests.map((request) => (
                    <JoinRequestCard
                      key={request.id}
                      request={request}
                      onApprove={() => handleApprove(request.id)}
                      onReject={() => handleReject(request.id)}
                      isApproving={isApproving}
                      isRejecting={isRejecting}
                    />
                  ))}

                  {processedRequests.length > 0 && (
                    <>
                      <h3 className="text-sm font-medium text-muted-foreground mb-2 mt-6">
                        Traitées ({processedRequests.length})
                      </h3>
                      {processedRequests.map((request) => (
                        <JoinRequestCard
                          key={request.id}
                          request={request}
                          onApprove={() => {}}
                          onReject={() => {}}
                          isApproving={false}
                          isRejecting={false}
                        />
                      ))}
                    </>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="teachers" className="flex-1 mt-0">
          <ScrollArea className="h-full">
            <div className="p-6">
              <div className="text-center py-12">
                <div className="inline-flex p-4 rounded-full bg-muted mb-4">
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Messages des enseignants</h3>
                <p className="text-sm text-muted-foreground">
                  Les messages de vos enseignants apparaîtront ici
                </p>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="parents" className="flex-1 mt-0">
          <ScrollArea className="h-full">
            <div className="p-6">
              <div className="text-center py-12">
                <div className="inline-flex p-4 rounded-full bg-muted mb-4">
                  <MessageSquare className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Messages des parents</h3>
                <p className="text-sm text-muted-foreground">
                  Les messages des parents apparaîtront ici
                </p>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};
