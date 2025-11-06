import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, ShoppingCart, MessageCircleMore, User, GraduationCap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useUnreadCounts } from '@/hooks/useUnreadCounts';
import { useNavigation, NavigationView } from '@/contexts/NavigationContext';
import { useTranslation } from 'react-i18next';
import { useCart } from '@/hooks/useCart';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentView, setCurrentView } = useNavigation();
  const { data: unreadCounts } = useUnreadCounts();
  const { t } = useTranslation();
  const { cartItemsCount } = useCart();

  const navItems = [
    { icon: Home, label: t('nav.home'), view: 'home' as NavigationView, path: '/' },
    { icon: ShoppingCart, label: t('nav.shop'), view: 'shop' as NavigationView, path: '/shop' },
    { icon: GraduationCap, label: t('nav.courses'), view: 'cours' as NavigationView, path: '/cours', special: true },
    { icon: MessageCircleMore, label: t('nav.messages'), view: 'messages' as NavigationView, path: '/messages' },
    { icon: User, label: t('nav.profile'), view: 'profil' as NavigationView, path: '/profil' },
  ];

  const handleNavigation = (item: typeof navItems[0]) => {
    setCurrentView(item.view);
    navigate(item.path);
  };

  const isCurrentRoute = (path: string) => {
    return location.pathname === path || (path === '/' && location.pathname === '/home');
  };

  return (
    // Section: Conteneur principal de la barre de navigation - utilise rem pour l'accessibilité
    <nav className="bg-white border-t border-gray-200 px-[1rem] py-[0.25rem] relative">
      <div className="flex justify-around items-center relative">
        {navItems.map((item, index) => {
          const isActive = isCurrentRoute(item.path);
          const Icon = item.icon;
          const showBadge = item.view === 'messages' && unreadCounts && unreadCounts.total > 0;
          const showCartBadge = item.view === 'shop' && cartItemsCount > 0;
          
          // Section: Style spécial pour l'onglet "Cours" (bouton central)
          // Déplacement du label "Cours" à l'intérieur du cercle coloré, sous l'icône.
          if (item.special) {
            return (
              <button
                key={item.view}
                onClick={() => handleNavigation(item)}
                className="relative flex flex-col items-center"
              >
                {/* Conteneur principal du bouton spécial */}
                <div className={`
                  w-[3rem] h-[3rem] rounded-full flex items-center justify-center flex-col
                  transform -translate-y-2 shadow-lg transition-all duration-300
                  ${isActive 
                    ? 'bg-gradient-to-r from-edu-primary to-edu-secondary scale-110 shadow-xl' 
                    : 'bg-gradient-to-r from-edu-whatsapp-green to-green-400 hover:scale-105 hover:shadow-xl'
                  }
                `}>
                  <Icon 
                    className={`w-[1.5rem] h-[1.5rem] text-white ${isActive ? 'animate-bounce-subtle' : ''}`} 
                  />
                  {/* Label du bouton spécial déplacé à l'intérieur du cercle */}
                  <span className="text-[0.65rem] font-bold text-white mt-0.5 transition-colors duration-200 leading-tight">
                    {item.label}
                  </span>
                </div>
                
                {/* Le label externe est supprimé car il est maintenant à l'intérieur du cercle */}
                {/* Indicateur actif pour le bouton spécial */}
                {isActive && (
                  <div className="absolute -bottom-1 w-[0.5rem] h-[0.5rem] bg-edu-primary rounded-full animate-pulse" />
                )}
              </button>
            );
          }
          
          // Section: Style normal pour les autres onglets
          // Réduction du padding vertical (py-1.5 -> py-1) et de la taille des icônes (size={18} -> size={16}).
          // Le texte reste en text-xs pour ne pas le rendre illisible.
          return (
            <button
              key={item.view}
              onClick={() => handleNavigation(item)}
              className={`flex flex-col items-center py-[0.25rem] px-[0.75rem] rounded-lg transition-all duration-200 relative ${
                isActive
                  ? 'text-edu-primary bg-edu-primary/10'
                  : 'text-gray-600 hover:text-edu-primary hover:bg-gray-50'
              }`}
            >
              <div className="relative">
                <Icon className={`w-[1.25rem] h-[1.25rem] mb-0.5 ${isActive ? 'animate-bounce-subtle' : ''} ${showCartBadge ? 'animate-pulse' : ''}`} />
                {showBadge && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1.5 -right-1.5 min-h-[1rem] min-w-[1rem] h-auto w-auto flex items-center justify-center p-[0.125rem] text-[0.65rem] leading-none"
                  >
                    {unreadCounts.total > 99 ? '99+' : unreadCounts.total}
                  </Badge>
                )}
                {showCartBadge && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1.5 -right-1.5 min-h-[1rem] min-w-[1rem] h-auto w-auto flex items-center justify-center p-[0.125rem] text-[0.65rem] leading-none animate-bounce"
                  >
                    {cartItemsCount > 99 ? '99+' : cartItemsCount}
                  </Badge>
                )}
              </div>
              <span className="text-[0.75rem] font-medium leading-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default Navbar;