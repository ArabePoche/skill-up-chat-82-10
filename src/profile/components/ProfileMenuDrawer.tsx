import React, { useState } from 'react';
import { X, Settings, BookOpen, Award, Bell, HelpCircle, LogOut, Shield, Globe, School } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useVerification } from '@/hooks/useVerification';
import VerifiedBadge from '@/components/VerifiedBadge';
import VerificationRequestModal from '@/verification/components/VerificationRequestModal';
import SchoolManagementModal from '@/school/components/SchoolManagementModal';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useTranslation } from 'react-i18next';

interface ProfileMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onShowNotificationDialog: () => void;
}

const ProfileMenuDrawer: React.FC<ProfileMenuDrawerProps> = ({ 
  isOpen, 
  onClose, 
  onShowNotificationDialog 
}) => {
  const navigate = useNavigate();
  const { profile, user, logout } = useAuth();
  const { hasPendingRequest } = useVerification(user?.id);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showSchoolModal, setShowSchoolModal] = useState(false);
  const { t } = useTranslation();

  const handleLogout = async () => {
    await logout();
    navigate('/auth');
  };

  const menuItems = [
    { icon: Settings, label: t('settings.general'), action: () => navigate('/complete-profile') },
    { icon: BookOpen, label: t('courses.myCourses'), action: () => navigate('/cours') },
    { icon: Award, label: t('profile.notifications'), action: () => {} },
    { icon: Bell, label: t('profile.notifications'), action: () => { onClose(); onShowNotificationDialog(); } },
    { icon: HelpCircle, label: t('common.help', { defaultValue: 'Aide et support' }), action: () => {} }
  ];

  // Ajouter le bouton École pour TOUS les utilisateurs
  menuItems.push({
    icon: School,
    label: t('school.title', { defaultValue: 'École' }),
    action: () => {
      setShowSchoolModal(true);
      onClose();
    }
  });

  // Ajouter le bouton de certification si pas encore vérifié
  // @ts-ignore - is_verified sera disponible après régénération des types Supabase
  if (!(profile as any)?.is_verified && !hasPendingRequest) {
    menuItems.push({
      icon: null as any,
      label: t('common.certification', { defaultValue: 'Demander la certification' }),
      action: () => {
        onClose();
        setShowVerificationModal(true);
      }
    });
  }

  // Ajouter le menu admin si l'utilisateur est admin
  if (profile?.role === 'admin') {
    menuItems.push({
      icon: Shield,
      label: t('admin.dashboard'),
      action: () => navigate('/admin')
    });
  }

  return (
    <>
      {/* Modal de demande de certification - toujours monté */}
      <VerificationRequestModal
        isOpen={showVerificationModal}
        onClose={() => setShowVerificationModal(false)}
      />

      {/* Modal de gestion d'école - toujours monté */}
      <SchoolManagementModal
        isOpen={showSchoolModal}
        onClose={() => setShowSchoolModal(false)}
      />

      {/* Drawer - conditionnel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 z-40 transition-opacity"
            onClick={onClose}
          />

          {/* Drawer */}
          <div className="fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-background shadow-xl z-50 overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold">{t('common.menu', { defaultValue: 'Menu' })}</h2>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-muted rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Menu Items */}
            <div className="py-2">
              {menuItems.map((item, index) => {
                const Icon = item.icon;
                const isVerificationButton = item.label === 'Demander la certification';
                
                return (
                  <button
                    key={index}
                    onClick={() => {
                      item.action();
                      if (item.label !== 'Notifications') onClose();
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors ${
                      item.label === 'Administration' ? 'bg-red-50 dark:bg-red-950/20' : ''
                    }`}
                  >
                    {isVerificationButton ? (
                      <VerifiedBadge size={20} showTooltip={false} />
                    ) : (
                      Icon && <Icon 
                        size={20} 
                        className={item.label === 'Administration' ? 'text-red-600' : 'text-muted-foreground'} 
                      />
                    )}
                    <span className={`flex-1 text-left ${
                      item.label === 'Administration' ? 'text-red-600 font-medium' : ''
                    }`}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
              
              {/* Sélecteur de langue */}
              <div className="px-4 py-3 border-t border-border mt-2">
                <div className="flex items-center gap-3">
                  <Globe size={20} className="text-muted-foreground" />
                  <div className="flex-1">
                    <LanguageSwitcher />
                  </div>
                </div>
              </div>
            </div>

            {/* Logout */}
            <div className="p-4 border-t border-border mt-auto">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 border border-red-200 dark:border-red-900 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
              >
                <LogOut size={20} />
                <span>{t('common.logout')}</span>
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default ProfileMenuDrawer;
