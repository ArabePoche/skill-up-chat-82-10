/**
 * Séparateur de date pour les messages (style WhatsApp)
 */
import React from 'react';

interface DateSeparatorProps {
  date: string;
}

const DateSeparator: React.FC<DateSeparatorProps> = ({ date }) => {
  return (
    <div className="flex items-center justify-center my-4">
      <div className="bg-muted/80 backdrop-blur-sm px-3 py-1 rounded-full">
        <span className="text-xs font-medium text-muted-foreground capitalize">
          {date}
        </span>
      </div>
    </div>
  );
};

export default DateSeparator;
