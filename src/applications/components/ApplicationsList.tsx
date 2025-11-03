// Liste des candidatures pour les recruteurs
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ApplicationCard } from './ApplicationCard';
import { useApplications, useUpdateApplicationStatus } from '../hooks/useApplications';
import { Loader2 } from 'lucide-react';

interface ApplicationsListProps {
  recruiterId: string;
}

export const ApplicationsList: React.FC<ApplicationsListProps> = ({ recruiterId }) => {
  const { data: applications, isLoading } = useApplications(recruiterId);
  const { mutateAsync: updateStatus, isPending: isUpdating } = useUpdateApplicationStatus();
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  const handleApprove = async (applicationId: string) => {
    await updateStatus({ applicationId, status: 'approved' });
  };

  const handleReject = async (applicationId: string) => {
    await updateStatus({ applicationId, status: 'rejected' });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!applications || applications.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Aucune candidature pour le moment</p>
      </div>
    );
  }

  const pendingApplications = applications.filter(app => app.status === 'pending');
  const approvedApplications = applications.filter(app => app.status === 'approved');
  const rejectedApplications = applications.filter(app => app.status === 'rejected');

  const getFilteredApplications = () => {
    switch (activeTab) {
      case 'pending':
        return pendingApplications;
      case 'approved':
        return approvedApplications;
      case 'rejected':
        return rejectedApplications;
      default:
        return applications;
    }
  };

  const filteredApplications = getFilteredApplications();

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">
            Toutes ({applications.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            En attente ({pendingApplications.length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approuvées ({approvedApplications.length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejetées ({rejectedApplications.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {filteredApplications.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Aucune candidature dans cette catégorie</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredApplications.map((application) => (
                <ApplicationCard
                  key={application.id}
                  application={application}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  isUpdating={isUpdating}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
