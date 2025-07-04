
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, ShoppingBag, BookOpen, MessageSquare, User, GraduationCap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useUnreadCounts } from '@/hooks/useUnreadCounts';

const Navbar = () => {
  const location = useLocation();
  const { data: unreadCounts } = useUnreadCounts();

  const navItems = [
    { icon: Home, label: 'Accueil', path: '/' },
    { icon: ShoppingBag, label: 'Shop', path: '/shop' },
    { icon: GraduationCap, label: 'Cours', path: '/cours', special: true },
    { icon: MessageSquare, label: 'Messages', path: '/messages' },
    { icon: User, label: 'Profil', path: '/profil' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm border-t border-gray-200 px-4 py-2 z-40 md:top-0 md:bottom-auto md:border-t-0 md:border-b">
      <div className="flex justify-around items-center md:justify-center md:space-x-8">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          const showBadge = item.path === '/messages' && unreadCounts && unreadCounts.total > 0;
          
          return (
            <Link
              key={item.path}
              to={item.path}
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
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default Navbar;
