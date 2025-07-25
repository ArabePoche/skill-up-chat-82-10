
import React from 'react';
import { useAdminUserManagement } from '@/hooks/useAdminUserManagement';
import EnrollmentRequestCard from './EnrollmentRequestCard';

const UserEnrollmentTable: React.FC = () => {
  const { 
    enrollmentRequests, 
    isLoadingEnrollments, 
    approveEnrollment, 
    isApprovingEnrollment 
  } = useAdminUserManagement();

  if (isLoadingEnrollments) {
    return (
      <div className="text-center py-8">
        <div className="text-lg font-semibold mb-2">Chargement des demandes...</div>
      </div>
    );
  }

  if (!enrollmentRequests || enrollmentRequests.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-lg font-semibold mb-2">Aucune demande d'inscription</div>
        <p className="text-gray-600">Il n'y a actuellement aucune demande d'inscription en attente.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
      {enrollmentRequests.map((enrollment) => (
        <EnrollmentRequestCard
          key={enrollment.id}
          enrollment={enrollment}
          onApprove={approveEnrollment}
          isUpdating={isApprovingEnrollment}
        />
      ))}
    </div>
  );
};

export default UserEnrollmentTable;
