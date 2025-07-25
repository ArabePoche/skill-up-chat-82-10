
import React from 'react';
import { Settings, BookOpen, Award, Bell, HelpCircle, Shield } from 'lucide-react';

interface ProfileMenuProps {
  menuItems: Array<{
    icon: any;
    label: string;
    action: () => void;
  }>;
}

const ProfileMenu: React.FC<ProfileMenuProps> = ({ menuItems }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border divide-y divide-gray-100">
      {menuItems.map((item, index) => {
        const Icon = item.icon;
        return (
          <button
            key={index}
            onClick={item.action}
            className={`w-full flex items-center p-4 hover:bg-gray-50 transition-colors ${
              item.label === 'Administration' ? 'bg-red-50 hover:bg-red-100' : ''
            }`}
          >
            <Icon 
              size={20} 
              className={`mr-3 ${
                item.label === 'Administration' ? 'text-red-600' : 'text-gray-500'
              }`} 
            />
            <span className={`flex-1 text-left ${
              item.label === 'Administra' ? 'text-red-600 font-medium' : ''
            }`}>
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default ProfileMenu;
