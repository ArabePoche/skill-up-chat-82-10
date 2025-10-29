import React, { useState } from 'react';
import { X, Settings, BookOpen, Award, Bell, HelpCircle, LogOut, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useVerification } from '@/hooks/useVerification';
import VerifiedBadge from '@/components/VerifiedBadge';
import VerificationRequestModal from '@/verification/components/VerificationRequestModal';

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

  const handleLogout = async () => {
    await logout();
    navigate('/auth');
  };

  const menuItems = [
    { icon: Settings, label: 'Paramètres', action: () => navigate('/complete-profile') },
    { icon: BookOpen, label: 'Mes formations', action: () => navigate('/cours') },
    { icon: Award, label: 'Badges et récompenses', action: () => {} },
    { icon: Bell, label: 'Notifications', action: () => { onClose(); onShowNotificationDialog(); } },
    { icon: HelpCircle, label: 'Aide et support', action: () => {} }
  ];

  // Ajouter le bouton de certification si pas encore vérifié
  // @ts-ignore - is_verified sera disponible après régénération des types Supabase
  if (!(profile as any)?.is_verified && !hasPendingRequest) {
    menuItems.push({
      icon: null as any,
      label: 'Demander la certification',
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
      label: 'Administration',
      action: () => navigate('/admin')
    });
  }

  if (!isOpen) return null;

  return (
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
          <h2 className="text-lg font-semibold">Menu</h2>
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
        </div>

        {/* Logout */}
        <div className="p-4 border-t border-border mt-auto">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 border border-red-200 dark:border-red-900 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
          >
            <LogOut size={20} />
            <span>Se déconnecter</span>
          </button>
        </div>
      </div>

      {/* Modal de demande de certification */}
      <VerificationRequestModal
        isOpen={showVerificationModal}
        onClose={() => setShowVerificationModal(false)}
      />
    </>
  );
};

export default ProfileMenuDrawer;
