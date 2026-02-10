/**
 * Composant de sélection avancée de destinataires par groupe et par classe
 * Permet à la direction de sélectionner tous les profs, tous les parents,
 * ou de filtrer par classe avant de sélectionner
 */
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Users, GraduationCap, Briefcase, User, ChevronDown, ChevronRight,
  CheckSquare, Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SchoolMember } from '../types';

interface ClassInfo {
  id: string;
  name: string;
  cycle: string;
}

interface MemberGroup {
  key: string;
  label: string;
  members: SchoolMember[];
}

interface RecipientGroupPickerProps {
  groups: MemberGroup[];
  classes: ClassInfo[];
  classMemberMap: Record<string, SchoolMember[]>; // classId -> members (teachers or parents of that class)
  selectedRecipientIds: Set<string>;
  onAddRecipients: (members: SchoolMember[]) => void;
  onRemoveRecipients: (memberIds: string[]) => void;
}

const roleIcons: Record<string, React.ElementType> = {
  admin: Briefcase,
  owner: Briefcase,
  teacher: GraduationCap,
  staff: Briefcase,
  secretary: Briefcase,
  parent: Users,
  student: User,
  member: User,
};

const groupColors: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  teacher: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  staff: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  parent: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  student: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
};

export const RecipientGroupPicker: React.FC<RecipientGroupPickerProps> = ({
  groups,
  classes,
  classMemberMap,
  selectedRecipientIds,
  onAddRecipients,
  onRemoveRecipients,
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [filterMode, setFilterMode] = useState<string | null>(null); // 'teacher' | 'parent' to show class filter

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const isGroupFullySelected = (group: MemberGroup) =>
    group.members.length > 0 && group.members.every(m => selectedRecipientIds.has(m.id));

  const isGroupPartiallySelected = (group: MemberGroup) =>
    group.members.some(m => selectedRecipientIds.has(m.id)) && !isGroupFullySelected(group);

  const toggleSelectAllGroup = (group: MemberGroup) => {
    if (isGroupFullySelected(group)) {
      onRemoveRecipients(group.members.map(m => m.id));
    } else {
      const toAdd = group.members.filter(m => !selectedRecipientIds.has(m.id));
      onAddRecipients(toAdd);
    }
  };

  const toggleSelectClassMembers = (classId: string) => {
    const classMembers = classMemberMap[classId] || [];
    const allSelected = classMembers.every(m => selectedRecipientIds.has(m.id));
    if (allSelected) {
      onRemoveRecipients(classMembers.map(m => m.id));
    } else {
      const toAdd = classMembers.filter(m => !selectedRecipientIds.has(m.id));
      onAddRecipients(toAdd);
    }
  };

  const canFilterByClass = (groupKey: string) => groupKey === 'teacher' || groupKey === 'parent';

  return (
    <div className="border rounded-lg bg-card">
      <div className="px-3 py-2 border-b bg-muted/30">
        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <Filter className="h-3 w-3" />
          Sélection par groupe
        </p>
      </div>

      <ScrollArea className="max-h-60">
        <div className="p-1.5 space-y-1">
          {groups.map((group) => {
            const Icon = roleIcons[group.key] || Users;
            const isExpanded = expandedGroups.has(group.key);
            const fullySelected = isGroupFullySelected(group);
            const partiallySelected = isGroupPartiallySelected(group);
            const showClassFilter = filterMode === group.key && canFilterByClass(group.key);
            const selectedCount = group.members.filter(m => selectedRecipientIds.has(m.id)).length;

            return (
              <div key={group.key} className="rounded-md border bg-background">
                {/* Group header */}
                <div className="flex items-center gap-2 px-2.5 py-2">
                  <Checkbox
                    checked={fullySelected ? true : partiallySelected ? 'indeterminate' : false}
                    onCheckedChange={() => toggleSelectAllGroup(group)}
                    className="h-4 w-4"
                  />
                  <Badge variant="outline" className={cn('gap-1 text-xs font-normal', groupColors[group.key])}>
                    <Icon className="h-3 w-3" />
                    {group.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {selectedCount > 0 && (
                      <span className="text-primary font-medium">{selectedCount}/</span>
                    )}
                    {group.members.length}
                  </span>

                  {canFilterByClass(group.key) && classes.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-1.5 text-xs gap-1"
                      onClick={() => {
                        setFilterMode(filterMode === group.key ? null : group.key);
                        if (!isExpanded) toggleGroup(group.key);
                      }}
                    >
                      <Filter className="h-3 w-3" />
                      Par classe
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => toggleGroup(group.key)}
                  >
                    {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  </Button>
                </div>

                {/* Expanded: class filter or member list */}
                {isExpanded && (
                  <div className="px-2.5 pb-2 pt-0">
                    <Separator className="mb-2" />

                    {showClassFilter ? (
                      /* Class-based filter */
                      <div className="space-y-1">
                        {classes.map((cls) => {
                          const classMembers = (classMemberMap[cls.id] || []).filter(
                            m => m.role === (group.key === 'teacher' ? 'teacher' : 'parent')
                          );
                          if (classMembers.length === 0) return null;

                          const allClassSelected = classMembers.every(m => selectedRecipientIds.has(m.id));
                          const someClassSelected = classMembers.some(m => selectedRecipientIds.has(m.id));
                          const classSelectedCount = classMembers.filter(m => selectedRecipientIds.has(m.id)).length;

                          return (
                            <div
                              key={cls.id}
                              className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer transition-colors"
                              onClick={() => toggleSelectClassMembers(cls.id)}
                            >
                              <Checkbox
                                checked={allClassSelected ? true : someClassSelected ? 'indeterminate' : false}
                                onCheckedChange={() => toggleSelectClassMembers(cls.id)}
                                className="h-3.5 w-3.5"
                              />
                              <span className="text-sm flex-1">{cls.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {classSelectedCount > 0 && <span className="text-primary">{classSelectedCount}/</span>}
                                {classMembers.length}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* Individual member list */
                      <div className="space-y-0.5">
                        {group.members.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted cursor-pointer transition-colors"
                            onClick={() => {
                              if (selectedRecipientIds.has(member.id)) {
                                onRemoveRecipients([member.id]);
                              } else {
                                onAddRecipients([member]);
                              }
                            }}
                          >
                            <Checkbox
                              checked={selectedRecipientIds.has(member.id)}
                              className="h-3.5 w-3.5"
                            />
                            <span className="text-sm truncate flex-1">{member.name}</span>
                            <span className="text-xs text-muted-foreground truncate max-w-24">{member.email}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};
