/**
 * Filtres fixes pour le chat groupe permettant aux élèves de filtrer par type de contenu
 */
import React from 'react';
import { Video, FileText, Send, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

export type GroupFilterType = 'all' | 'videos' | 'exercises' | 'submissions' | 'messages';

interface GroupChatFiltersProps {
  activeFilter: GroupFilterType;
  onFilterChange: (filter: GroupFilterType) => void;
}

const filters: { type: GroupFilterType; label: string; icon: React.ReactNode }[] = [
  { type: 'all', label: 'Tout', icon: null },
  { type: 'videos', label: 'Vidéos', icon: <Video size={14} /> },
  { type: 'exercises', label: 'Exercices', icon: <FileText size={14} /> },
  { type: 'submissions', label: 'Soumissions', icon: <Send size={14} /> },
  { type: 'messages', label: 'Messages', icon: <MessageSquare size={14} /> },
];

export const GroupChatFilters: React.FC<GroupChatFiltersProps> = ({
  activeFilter,
  onFilterChange,
}) => {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 px-1 scrollbar-hide">
      {filters.map((filter) => (
        <button
          key={filter.type}
          onClick={() => onFilterChange(filter.type)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
            activeFilter === filter.type
              ? "bg-[#25d366] text-white"
              : "bg-white/80 text-gray-700 hover:bg-white"
          )}
        >
          {filter.icon}
          {filter.label}
        </button>
      ))}
    </div>
  );
};
