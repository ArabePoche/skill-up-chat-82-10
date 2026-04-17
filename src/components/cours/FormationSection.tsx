
import React from 'react';
import { GraduationCap, UserCheck, LayoutDashboard, Plus } from 'lucide-react';
import FormationCard from '@/components/FormationCard';
import { Button } from '@/components/ui/button';

interface FormationSectionProps {
  title: string;
  icon: 'student' | 'teacher';
  formations: any[];
  isTeacherSection: boolean;
  onFormationClick: (formation: any) => void;
  emptyMessage?: string;
  debugInfo?: string;
  onDashboardClick?: () => void;
  onCreateClick?: () => void;
}

const FormationSection: React.FC<FormationSectionProps> = ({
  title,
  icon,
  formations,
  isTeacherSection,
  onFormationClick,
  emptyMessage,
  debugInfo,
  onDashboardClick,
  onCreateClick
}) => {
  const IconComponent = icon === 'student' ? GraduationCap : UserCheck;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <IconComponent size={20} className="text-[#25d366]" />
          <h2 className="text-lg sm:text-xl font-semibold">{title}</h2>
        </div>

        <div className="flex items-center gap-2">
          {onCreateClick && (
            <Button
              size="sm"
              onClick={onCreateClick}
              className="flex items-center gap-2 text-sm bg-primary hover:bg-primary/90"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Créer une formation</span>
              <span className="sm:hidden">Créer</span>
            </Button>
          )}

          {onDashboardClick && (
            <Button
              variant="outline"
              size="sm"
              onClick={onDashboardClick}
              className="flex items-center gap-2 text-sm"
            >
              <LayoutDashboard size={16} />
              <span className="hidden sm:inline">Tableau de bord</span>
              <span className="sm:hidden">Gérer</span>
            </Button>
          )}
        </div>
      </div>

      {formations.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {formations.map((formation) => (
            <FormationCard
              key={`${isTeacherSection ? 'teacher' : 'student'}-${formation.id}`}
              formation={{
                ...formation,
                author: formation.profiles ? 
                  `${formation.profiles.first_name || ''} ${formation.profiles.last_name || ''}`.trim() || 
                  formation.profiles.username || 'Auteur inconnu' : 'Auteur inconnu',
                students: formation.students_count || 0,
                rating: formation.rating || 0,
                reviews_count: formation.reviews_count || 0
              }}
              isTeacherSection={isTeacherSection}
              onClick={onFormationClick}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500">{emptyMessage}</p>
          {debugInfo && <p className="text-xs text-gray-400 mt-1">{debugInfo}</p>}
        </div>
      )}
    </div>
  );
};

export default FormationSection;
