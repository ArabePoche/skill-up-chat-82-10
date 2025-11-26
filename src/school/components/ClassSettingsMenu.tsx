/**
 * Menu unifié pour les actions de gestion d'une classe
 */
import React from 'react';
import { Settings, BookOpen, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ClassSettingsMenuProps {
  onManageSubjects: () => void;
  onEditClass: () => void;
  onDeleteClass: () => void;
}

export const ClassSettingsMenu: React.FC<ClassSettingsMenuProps> = ({
  onManageSubjects,
  onEditClass,
  onDeleteClass,
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={onManageSubjects}>
          <BookOpen className="h-4 w-4 mr-2" />
          Gérer les matières
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onEditClass}>
          <Pencil className="h-4 w-4 mr-2" />
          Modifier la classe
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={onDeleteClass}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Supprimer
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
