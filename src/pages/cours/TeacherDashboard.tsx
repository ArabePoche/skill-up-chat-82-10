import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import FormationsManagement from '@/components/admin/FormationsManagement';
import DashboardStats from '@/components/admin/DashboardStats';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, LayoutDashboard, CreditCard, DollarSign, BookOpen, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import CreatorPaymentsView from '@/components/creator/CreatorPaymentsView';
import CreatorEarningsView from '@/components/creator/CreatorEarningsView';

import TeachersManagement from '@/components/admin/TeachersManagement';

const TeacherDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: LayoutDashboard },
    { id: 'formations', label: 'Mes Formations', icon: BookOpen },
    { id: 'profs', label: 'Mes Professeurs', icon: Users },
    { id: 'payments', label: 'Paiements & Abos', icon: CreditCard },
    { id: 'earnings', label: 'Mes Gains', icon: DollarSign },
  ];

  if (!user?.id) {
    return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <DashboardStats authorId={user.id} />;
      case 'formations':
        return <FormationsManagement authorId={user.id} />;
      case 'profs':
        return <TeachersManagement />;
      case 'payments':
        return <CreatorPaymentsView authorId={user.id} />;
      case 'earnings':
        return <CreatorEarningsView authorId={user.id} />;
      default:
        return <DashboardStats authorId={user.id} />;
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar Desktop / Banner Mobile */}
      <div className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r flex-shrink-0 z-10 md:h-full flex flex-col shadow-sm md:shadow-none">
        <div className="p-4 border-b flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/cours')}
            className="mr-2 h-8 w-8 text-gray-500 hover:text-gray-900"
          >
            <ArrowLeft size={18} />
          </Button>
          <h2 className="font-bold text-lg text-gray-800">Espace Créateur</h2>
        </div>

        <div className="overflow-y-auto w-full hide-scrollbar">
          <nav className="flex flex-col p-2 md:p-3 space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex w-full items-center justify-between whitespace-nowrap px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-[#25d366]/10 text-[#1da851]'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center">
                    <Icon className={`mr-2 md:mr-3 flex-shrink-0 h-5 w-5 ${isActive ? 'text-[#1da851]' : 'text-gray-400'}`} />
                    {tab.label}
                  </div>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-gray-50/50">
        <header className="hidden md:flex bg-white border-b shadow-sm z-30 h-14 items-center px-6">
          <h1 className="text-lg font-semibold text-gray-800">
            {tabs.find(t => t.id === activeTab)?.label || 'Tableau de bord'}
          </h1>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default TeacherDashboard;

