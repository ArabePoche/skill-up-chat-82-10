/**
 * Section de sélection de date et horaires
 */
import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface DateTimeSectionProps {
  date: string;
  startTime: string;
  endTime: string;
  onDateTimeChange: (date: string, start: string, end: string) => void;
}

export const DateTimeSection: React.FC<DateTimeSectionProps> = ({
  date,
  startTime,
  endTime,
  onDateTimeChange,
}) => {
  return (
    <div className="space-y-3">
      <h4 className="font-medium text-foreground">Date & Horaires</h4>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Date *</Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => onDateTimeChange(e.target.value, startTime, endTime)}
          />
        </div>

        <div className="space-y-2">
          <Label>Heure de début *</Label>
          <Input
            type="time"
            value={startTime}
            onChange={(e) => onDateTimeChange(date, e.target.value, endTime)}
          />
        </div>

        <div className="space-y-2">
          <Label>Heure de fin *</Label>
          <Input
            type="time"
            value={endTime}
            onChange={(e) => onDateTimeChange(date, startTime, e.target.value)}
          />
        </div>
      </div>

      {startTime && endTime && startTime >= endTime && (
        <p className="text-sm text-destructive">
          L'heure de fin doit être après l'heure de début
        </p>
      )}
    </div>
  );
};
