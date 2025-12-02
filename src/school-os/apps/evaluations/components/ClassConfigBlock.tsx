/**
 * Bloc de configuration pour une classe spécifique
 * Contient : matières, élèves, surveillants, salle, date, questionnaires
 */
import React, { useState, useEffect } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { SubjectsSection } from './SubjectsSection';
import { StudentsSection } from './StudentsSection';
import { SupervisorsSection } from './SupervisorsSection';
import { RoomSection } from './RoomSection';
import { DateTimeSection } from './DateTimeSection';
import { QuestionnaireSection } from './QuestionnaireSection';
import type { ClassConfig } from '../hooks/useEvaluations';
import type { Class } from '@/school/hooks/useClasses';

interface ClassConfigBlockProps {
  classData: Class;
  config?: ClassConfig;
  onConfigChange: (config: ClassConfig) => void;
}

export const ClassConfigBlock: React.FC<ClassConfigBlockProps> = ({
  classData,
  config,
  onConfigChange,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [localConfig, setLocalConfig] = useState<ClassConfig>(
    config || {
      class_id: classData.id,
      subjects: [],
      subject_schedules: [],
      excluded_students: [],
      supervisors: [],
      room: '',
      location_type: 'room',
      date: '',
      start_time: '',
      end_time: '',
      questionnaires: [],
    }
  );

  useEffect(() => {
    if (config) {
      setLocalConfig(config);
    }
  }, [config]);

  const updateConfig = (updates: Partial<ClassConfig>) => {
    const newConfig = { ...localConfig, ...updates };
    setLocalConfig(newConfig);
    onConfigChange(newConfig);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border border-border rounded-lg">
      <CollapsibleTrigger className="w-full p-4 flex items-center justify-between bg-muted/50 hover:bg-muted/70 transition-colors rounded-t-lg">
        <h4 className="font-semibold text-foreground">{classData.name}</h4>
        {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
      </CollapsibleTrigger>

      <CollapsibleContent className="p-4 space-y-6">
        {/* Matières */}
        <SubjectsSection
          classId={classData.id}
          selectedSubjects={localConfig.subjects}
          onSubjectsChange={(subjects) => updateConfig({ subjects })}
        />

        {/* Élèves */}
        <StudentsSection
          classId={classData.id}
          excludedStudents={localConfig.excluded_students}
          onExcludedStudentsChange={(excluded) => updateConfig({ excluded_students: excluded })}
        />

        {/* Surveillants */}
        <SupervisorsSection
          selectedSupervisors={localConfig.supervisors}
          onSupervisorsChange={(supervisors) => updateConfig({ supervisors })}
        />

        {/* Salle / Lieu */}
        <RoomSection
          room={localConfig.room}
          locationType={localConfig.location_type}
          externalLocation={localConfig.external_location}
          onRoomChange={(room, type, external) =>
            updateConfig({ room, location_type: type, external_location: external })
          }
        />

        {/* Date & Horaires */}
        <DateTimeSection
          date={localConfig.date}
          startTime={localConfig.start_time}
          endTime={localConfig.end_time}
          onDateTimeChange={(date, start, end) =>
            updateConfig({ date, start_time: start, end_time: end })
          }
        />

        {/* Questionnaires par matière */}
        {localConfig.subjects.length > 0 && (
          <QuestionnaireSection
            subjects={localConfig.subjects}
            questionnaires={localConfig.questionnaires}
            onQuestionnairesChange={(questionnaires) => updateConfig({ questionnaires })}
          />
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};
