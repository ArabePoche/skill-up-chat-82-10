/**
 * Section de sélection de salle / lieu
 */
import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface RoomSectionProps {
  room: string;
  locationType: 'room' | 'external';
  externalLocation?: string;
  onRoomChange: (room: string, type: 'room' | 'external', external?: string) => void;
}

export const RoomSection: React.FC<RoomSectionProps> = ({
  room,
  locationType,
  externalLocation,
  onRoomChange,
}) => {
  return (
    <div className="space-y-3">
      <h4 className="font-medium text-foreground">Salle / Lieu</h4>

      <RadioGroup
        value={locationType}
        onValueChange={(value) =>
          onRoomChange(room, value as 'room' | 'external', externalLocation)
        }
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="room" id="room" />
          <Label htmlFor="room" className="cursor-pointer">
            Salle de l'école
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="external" id="external" />
          <Label htmlFor="external" className="cursor-pointer">
            Lieu externe
          </Label>
        </div>
      </RadioGroup>

      {locationType === 'room' && (
        <Input
          placeholder="Ex: Salle A12, Amphithéâtre..."
          value={room}
          onChange={(e) => onRoomChange(e.target.value, 'room', externalLocation)}
        />
      )}

      {locationType === 'external' && (
        <Input
          placeholder="Ex: Centre d'examens municipal, Gymnase..."
          value={externalLocation || ''}
          onChange={(e) => onRoomChange(room, 'external', e.target.value)}
        />
      )}
    </div>
  );
};
