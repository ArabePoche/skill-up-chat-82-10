
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, ShoppingCart, MessageSquare, User, GraduationCap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useUnreadCounts } from '@/hooks/useUnreadCounts';
import { useNavigation, NavigationView } from '@/contexts/NavigationContext';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentView, setCurrentView } = useNavigation();
  const { data: unreadCounts } = useUnreadCounts();

  const navItems = [
    { icon: Home, label: 'Accueil', view: 'home' as NavigationView, path: '/' },
    { icon: ShoppingCart, label: 'Shop', view: 'shop' as NavigationView, path: '/shop' },
    { icon: GraduationCap, label: 'Cours', view: 'cours' as NavigationView, path: '/cours', special: true },
    { icon: MessageSquare, label: 'Messages', view: 'messages' as NavigationView, path: '/messages' },
    { icon: User, label: 'Profil', view: 'profil' as NavigationView, path: '/profil' },
  ];

  const handleNavigation = (item: typeof navItems[0]) => {
    setCurrentView(item.view);
    navigate(item.path);
  };

  const isCurrentRoute = (path: string) => {
    return location.pathname === path || (path === '/' && location.pathname === '/home');
  };

  return (
    <nav className="bg-white border-t border-gray-200 px-4 py-0.5"> {/* ✅ Réduction de py-2 à py-1.5 */}
      <div className="flex justify-around items-center">
        {navItems.map((item) => {
          const isActive = isCurrentRoute(item.path);
          const Icon = item.icon;
          const showBadge = item.view === 'messages' && unreadCounts && unreadCounts.total > 0;
          
          return (
            <button
              key={item.view}
              onClick={() => handleNavigation(item)}
              className={`flex flex-col items-center py-1.5 px-3 rounded-lg transition-all duration-200 relative ${
                isActive
                  ? 'text-edu-primary bg-edu-primary/10'
                  : 'text-gray-600 hover:text-edu-primary hover:bg-gray-50'
              } ${item.special ? 'scale-110' : ''}`}
            >
              <div className="relative">
                <Icon size={item.special ? 22 : 18} className={`mb-0.5 ${isActive ? 'animate-bounce-subtle' : ''} ${item.special ? 'text-[#25d366]' : ''}`} /> {/* ✅ Réduction des tailles d'icônes et du margin */}
                {showBadge && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1.5 -right-1.5 h-4 w-4 flex items-center justify-center p-0 text-xs" /* ✅ Réduction de la taille du badge */
                  >
                    {unreadCounts.total > 99 ? '99+' : unreadCounts.total}
                  </Badge>
                )}
              </div>
              <span className={`text-xs font-medium ${item.special ? 'font-bold' : ''}`}>{item.label}</span> {/* ✅ Réduction de text-xs */}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default Navbar;
