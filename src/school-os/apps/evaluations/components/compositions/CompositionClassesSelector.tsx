/**
 * Sélecteur multi-classes pour les compositions
 */
import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ClassItem {
  id: string;
  name: string;
  cycle?: string;
  current_students?: number;
}

interface CompositionClassesSelectorProps {
  allClasses: ClassItem[];
  selectedClassIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export const CompositionClassesSelector: React.FC<CompositionClassesSelectorProps> = ({
  allClasses,
  selectedClassIds,
  onSelectionChange,
}) => {
  const handleToggle = (classId: string) => {
    if (selectedClassIds.includes(classId)) {
      onSelectionChange(selectedClassIds.filter(id => id !== classId));
    } else {
      onSelectionChange([...selectedClassIds, classId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedClassIds.length === allClasses.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(allClasses.map(c => c.id));
    }
  };

  const isAllSelected = allClasses.length > 0 && selectedClassIds.length === allClasses.length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Classes concernées *</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {selectedClassIds.length} / {allClasses.length} sélectionnée(s)
            </Badge>
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-sm text-primary hover:underline"
            >
              {isAllSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {allClasses.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune classe disponible</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {allClasses.map(cls => (
              <label
                key={cls.id}
                className={`
                  flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors
                  ${selectedClassIds.includes(cls.id)
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground'
                  }
                `}
              >
                <Checkbox
                  checked={selectedClassIds.includes(cls.id)}
                  onCheckedChange={() => handleToggle(cls.id)}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{cls.name}</p>
                  {cls.cycle && (
                    <p className="text-xs text-muted-foreground">{cls.cycle}</p>
                  )}
                </div>
              </label>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
