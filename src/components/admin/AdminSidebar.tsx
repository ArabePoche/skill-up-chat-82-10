import React from 'react';
import { BarChart3, Users, BookOpen, Package, Video, UserCheck, Shield, GraduationCap } from 'lucide-react';
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

const menuItems = [
  {
    title: 'Statistiques',
    value: 'stats',
    icon: BarChart3,
  },
  {
    title: 'Utilisateurs en ligne',
    value: 'online-users',
    icon: UserCheck,
  },
  {
    title: 'Créer Formation',
    value: 'create-formation',
    icon: BookOpen,
  },
  {
    title: 'Professeurs',
    value: 'teachers',
    icon: GraduationCap,
  },
  {
    title: 'Produits',
    value: 'products',
    icon: Package,
  },
  {
    title: 'Vidéos',
    value: 'videos',
    icon: Video,
  },
  {
    title: 'Utilisateurs',
    value: 'users',
    icon: Users,
  },
];

export function AdminSidebar({ activeTab, onTabChange }: AdminSidebarProps) {
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

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
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.value}>
                  <SidebarMenuButton
                    onClick={() => onTabChange(item.value)}
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
      </SidebarContent>
    </Sidebar>
  );
}