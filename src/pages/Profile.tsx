
import React from 'react';
import { useParams } from 'react-router-dom';

const Profile = () => {
  const { profileId } = useParams();

  return (
    <div className="min-h-screen bg-gray-50 pb-16 md:pt-16 md:pb-0">
      <div className="p-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Profil</h1>
        <p className="text-gray-600">Profile ID: {profileId}</p>
        <p className="text-gray-500 mt-4">Page en cours de développement...</p>
      </div>
    </div>
  );
};

export default Profile;
