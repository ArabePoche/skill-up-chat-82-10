/**
 * MySchoolsCarousel - Carousel horizontal des écoles de l'utilisateur
 * Style inspiré de Google Workspace apps
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserSchools } from '@/school/hooks/useUserSchools';
import { useAuth } from '@/hooks/useAuth';
import { Crown, Users, GraduationCap, Plus } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useTranslation } from 'react-i18next';
import CreateSchoolModal from '@/school/components/CreateSchoolModal';

const MySchoolsCarousel: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: schools, isLoading } = useUserSchools(user?.id);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown size={12} className="text-yellow-500" />;
      case 'staff':
        return <Users size={12} className="text-blue-500" />;
      case 'teacher':
        return <GraduationCap size={12} className="text-green-500" />;
      case 'parent':
        return <Users size={12} className="text-orange-500" />;
      default:
        return null;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner':
        return t('school.roles.owner', { defaultValue: 'Propriétaire' });
      case 'staff':
        return t('school.roles.staff', { defaultValue: 'Personnel' });
      case 'teacher':
        return t('school.roles.teacher', { defaultValue: 'Enseignant' });
      case 'parent':
        return t('school.roles.parent', { defaultValue: 'Parent' });
      default:
        return role;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRandomColor = (id: string) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-red-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-teal-500',
    ];
    const index = id.charCodeAt(0) % colors.length;
    return colors[index];
  };

  if (isLoading) {
    return (
      <div className="py-4">
        <div className="flex gap-4 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="w-20 h-24 bg-muted rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!schools || schools.length === 0) {
    return (
      <>
        <div className="py-2">
          <h3 className="text-sm font-medium text-muted-foreground mb-3 px-1">
            {t('school.mySchools', { defaultValue: 'Mes écoles' })}
          </h3>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-muted/50 transition-colors min-w-[80px] group"
          >
            <div className="w-12 h-12 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center group-hover:border-primary group-hover:scale-105 transition-all">
              <Plus size={20} className="text-muted-foreground group-hover:text-primary" />
            </div>
            <span className="text-xs text-muted-foreground group-hover:text-primary">
              {t('school.create', { defaultValue: 'Créer' })}
            </span>
          </button>
        </div>
        <CreateSchoolModal 
          isOpen={isCreateModalOpen} 
          onClose={() => setIsCreateModalOpen(false)} 
        />
      </>
    );
  }

  return (
    <>
      <div className="py-2">
        <h3 className="text-sm font-medium text-muted-foreground mb-3 px-1">
          {t('school.mySchools', { defaultValue: 'Mes écoles' })}
        </h3>
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-3 pb-2">
            {schools.map((school) => (
              <button
                key={school.id}
                onClick={() => navigate(`/school?id=${school.id}`)}
                className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-muted/50 transition-colors min-w-[80px] group"
              >
                <div className={`w-12 h-12 rounded-full ${getRandomColor(school.id)} flex items-center justify-center text-white font-medium text-sm shadow-sm group-hover:scale-105 transition-transform`}>
                  {getInitials(school.name)}
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-xs font-medium text-foreground truncate max-w-[70px]">
                    {school.name}
                  </span>
                  <div className="flex items-center gap-1">
                    {getRoleIcon(school.role)}
                    <span className="text-[10px] text-muted-foreground">
                      {getRoleLabel(school.role)}
                    </span>
                  </div>
                </div>
              </button>
            ))}
            
            {/* Bouton Créer une école */}
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-muted/50 transition-colors min-w-[80px] group"
            >
              <div className="w-12 h-12 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center group-hover:border-primary group-hover:scale-105 transition-all">
                <Plus size={20} className="text-muted-foreground group-hover:text-primary" />
              </div>
              <span className="text-xs text-muted-foreground group-hover:text-primary">
                {t('school.create', { defaultValue: 'Créer' })}
              </span>
            </button>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
      <CreateSchoolModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
      />
    </>
  );
};

export default MySchoolsCarousel;
