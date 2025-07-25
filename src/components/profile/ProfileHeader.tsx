
import React, { useState } from 'react';
import { Edit, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AvatarUploadModal from './AvatarUploadModal';

interface ProfileHeaderProps {
  profile: any;
  user: any;
  getInitials: () => string;
  getDisplayName: () => string;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  profile,
  user,
  getInitials,
  getDisplayName
}) => {
  const navigate = useNavigate();
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  return (
    <>
      <div className="bg-white shadow-sm">
        <div className="p-6">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-r from-edu-primary to-edu-secondary rounded-full flex items-center justify-center overflow-hidden cursor-pointer"
                   onClick={() => setShowAvatarModal(true)}>
                {profile?.avatar_url ? (
                  <img 
                    src={profile.avatar_url} 
                    alt="Avatar" 
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-white text-2xl font-bold">{getInitials()}</span>
                )}
              </div>
              <button 
                onClick={() => setShowAvatarModal(true)}
                className="absolute bottom-0 right-0 bg-edu-primary text-white p-1 rounded-full hover:bg-edu-primary/80 transition-colors"
              >
                <Edit size={12} />
              </button>
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{getDisplayName()}</h1>
              <p className="text-gray-600">{user?.email}</p>
              <p className="text-sm text-edu-primary mt-1">
                {profile?.is_teacher ? 'Enseignant' : 'Étudiant'} actif depuis {
                  new Date(user?.created_at || '').toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'long'
                  })
                }
              </p>
              {profile?.role === 'admin' && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 mt-1">
                  <Shield size={12} className="mr-1" />
                  Administrateurnnnnnnnn
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <AvatarUploadModal
        isOpen={showAvatarModal}
        onClose={() => setShowAvatarModal(false)}
        currentAvatarUrl={profile?.avatar_url}
      />
    </>
  );
};

export default ProfileHeader;