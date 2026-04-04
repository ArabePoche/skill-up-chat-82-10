import React from 'react';
import { ShieldCheck, Heart, ShoppingBag, Building2, TrendingUp, ShieldAlert, FileSearch, ShieldBan, Shield, ScrollText, BadgeAlert, Megaphone, Video, Bell, Coins, Users, GraduationCap, Package, BarChart3, UserCheck, CheckCircle, CreditCard, BookOpen, UsersRound, UserPlus } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar';

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const menuGroups = [
  {
    label: 'Tableau de Bord',
    items: [
      { title: 'Statistiques', value: 'stats', icon: BarChart3 },
      { title: 'Ã‰conomie (PIB)', value: 'currency-dashboard', icon: BarChart3 },
    ]
  },
  {
    label: 'Utilisateurs',
    items: [
      { title: 'Utilisateurs', value: 'users', icon: Users },
      { title: 'Utilisateurs en ligne', value: 'online-users', icon: UserCheck },
      { title: 'Demandes Certification', value: 'verification-requests', icon: CheckCircle },
    ]
  },
  {
    label: 'Ã‰coles',
    items: [
      { title: 'Toutes les Ã‰coles', value: 'schools-management', icon: Building2 },
      { title: 'Abonnements & Plans', value: 'school-subscriptions', icon: CreditCard },
      { title: 'Revenus & Paiements', value: 'school-revenue', icon: TrendingUp },
    ]
  },
  {
    label: 'Formations & PÃ©dagogie',
    items: [
      { title: 'Formations & Commissions', value: 'create-formation', icon: BookOpen },
      { title: 'Promotions', value: 'promotions', icon: UsersRound },
      { title: 'Suivi des paiements', value: 'payment-tracking', icon: CreditCard },
      { title: 'Professeurs', value: 'teachers', icon: GraduationCap },
      { title: 'Candidatures Encadreurs', value: 'teacher-applications', icon: UserPlus },
    ]
  },
  {
    label: 'Boutique & Finance',
    items: [
      { title: 'Marketplace', value: 'marketplace', icon: ShoppingBag },
      { title: 'Produits', value: 'products', icon: Package },
      { title: 'Monnaie Virtuelle', value: 'currency-settings', icon: Coins },
        { title: 'Réclamations Cadeaux', value: 'gift-disputes', icon: ShieldCheck },
    ]
  },
  {
    label: 'CommunautÃ© & Communication',
    items: [
      { title: 'VidÃ©os', value: 'videos', icon: Video },
      { title: 'Notifications Push', value: 'push-notifications', icon: Bell },
      { title: 'Annonces Recrutement', value: 'recruitment-ads', icon: Megaphone },
      { title: 'Aide Solidaire', value: 'solidarity', icon: Heart },
    ]
  }
];

export function AdminSidebar({ activeTab, onTabChange }: AdminSidebarProps) {
  const { state, setOpenMobile } = useSidebar();
  const isCollapsed = state === 'collapsed';

  const handleTabChange = (tab: string) => {
    onTabChange(tab);
    setOpenMobile(false);
  };

  return (
    <Sidebar className="border-r">
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-red-600" />
          {!isCollapsed && (
            <div>
              <h2 className="text-lg font-semibold">Admin</h2>
              <p className="text-sm text-muted-foreground">Tableau de bord</p>
            </div>
          )}
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        {menuGroups.map((group, index) => (
          <SidebarGroup key={index}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.value}>
                    <SidebarMenuButton
                      onClick={() => handleTabChange(item.value)}
                      isActive={activeTab === item.value}
                      tooltip={isCollapsed ? item.title : undefined}
                    >
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
