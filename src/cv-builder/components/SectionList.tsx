/**
 * Liste des sections du CV avec Drag & Drop (panneau gauche)
 * Permet de réorganiser les sections et d'activer/désactiver les sections avancées
 */
import React from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ChevronDown, ChevronUp, User, GraduationCap, Briefcase, Star, Globe, Heart, Award, FolderOpen, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CvSection, ADVANCED_SECTIONS } from '../types';

const ICON_MAP: Record<string, React.ElementType> = {
  User, GraduationCap, Briefcase, Star, Globe, Heart, Award, FolderOpen, Users,
};

interface SortableItemProps {
  section: CvSection;
  isActive: boolean;
  onClick: () => void;
}

const SortableItem: React.FC<SortableItemProps> = ({ section, isActive, onClick }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const Icon = ICON_MAP[section.icon] || User;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors border',
        isActive ? 'bg-primary/10 border-primary text-primary' : 'border-transparent hover:bg-muted',
        isDragging && 'opacity-50'
      )}
      onClick={onClick}
    >
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
        <GripVertical className="w-4 h-4" />
      </button>
      <Icon className="w-4 h-4 shrink-0" />
      <span className="text-sm font-medium truncate">{section.label}</span>
    </div>
  );
};

interface SectionListProps {
  sections: CvSection[];
  activeSection: string;
  onSelectSection: (id: string) => void;
  onReorder: (newOrder: string[]) => void;
  showAdvanced: boolean;
  onToggleAdvanced: () => void;
  onToggleAdvancedSection: (id: string) => void;
}

const SectionList: React.FC<SectionListProps> = ({
  sections, activeSection, onSelectSection, onReorder,
  showAdvanced, onToggleAdvanced, onToggleAdvancedSection,
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const ids = sections.map(s => s.id);
      const oldIdx = ids.indexOf(active.id as string);
      const newIdx = ids.indexOf(over.id as string);
      const newOrder = [...ids];
      newOrder.splice(oldIdx, 1);
      newOrder.splice(newIdx, 0, active.id as string);
      onReorder(newOrder);
    }
  };

  const enabledAdvanced = ADVANCED_SECTIONS.filter(adv => sections.some(s => s.id === adv.id));
  const disabledAdvanced = ADVANCED_SECTIONS.filter(adv => !sections.some(s => s.id === adv.id));

  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-1">Sections</p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
          {sections.map(section => (
            <SortableItem
              key={section.id}
              section={section}
              isActive={activeSection === section.id}
              onClick={() => onSelectSection(section.id)}
            />
          ))}
        </SortableContext>
      </DndContext>

      {/* Bouton "Plus de sections" */}
      <Button variant="ghost" size="sm" className="mt-2 justify-start gap-2 text-muted-foreground" onClick={onToggleAdvanced}>
        {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        {showAdvanced ? 'Moins de sections' : 'Plus de sections'}
      </Button>

      {showAdvanced && (
        <div className="space-y-1 pl-2">
          {disabledAdvanced.map(section => {
            const Icon = ICON_MAP[section.icon] || User;
            return (
              <button
                key={section.id}
                onClick={() => onToggleAdvancedSection(section.id)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:bg-muted w-full text-left transition-colors"
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm">+ {section.label}</span>
              </button>
            );
          })}
          {disabledAdvanced.length === 0 && (
            <p className="text-xs text-muted-foreground px-3 py-2">Toutes les sections sont activées.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default SectionList;
