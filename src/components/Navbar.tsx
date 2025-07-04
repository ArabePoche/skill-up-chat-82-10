
import React from 'react';
import { Home, ShoppingBag, MessageSquare, User, GraduationCap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useUnreadCounts } from '@/hooks/useUnreadCounts';
import { useNavigation, NavigationView } from '@/contexts/NavigationContext';

const Navbar = () => {
  const { currentView, setCurrentView } = useNavigation();
  const { data: unreadCounts } = useUnreadCounts();

  const navItems = [
    { icon: Home, label: 'Accueil', view: 'home' as NavigationView },
    { icon: ShoppingBag, label: 'Shop', view: 'shop' as NavigationView },
    { icon: GraduationCap, label: 'Cours', view: 'cours' as NavigationView, special: true },
    { icon: MessageSquare, label: 'Messages', view: 'messages' as NavigationView },
    { icon: User, label: 'Profil', view: 'profil' as NavigationView },
  ];

  return (
    <nav className="bg-white border-t border-gray-200 px-4 py-2">
      <div className="flex justify-around items-center">
        {navItems.map((item) => {
          const isActive = currentView === item.view;
          const Icon = item.icon;
          const showBadge = item.view === 'messages' && unreadCounts && unreadCounts.total > 0;
          
          return (
            <button
              key={item.view}
              onClick={() => setCurrentView(item.view)}
              className={`flex flex-col items-center py-2 px-3 rounded-lg transition-all duration-200 relative ${
                isActive
                  ? 'text-edu-primary bg-edu-primary/10'
                  : 'text-gray-600 hover:text-edu-primary hover:bg-gray-50'
              } ${item.special ? 'scale-110' : ''}`}
            >
              <div className="relative">
                <Icon size={item.special ? 24 : 20} className={`mb-1 ${isActive ? 'animate-bounce-subtle' : ''} ${item.special ? 'text-[#25d366]' : ''}`} />
                {showBadge && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
                  >
                    {unreadCounts.total > 99 ? '99+' : unreadCounts.total}
                  </Badge>
                )}
              </div>
              <span className={`text-xs font-medium ${item.special ? 'font-bold' : ''}`}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default Navbar;