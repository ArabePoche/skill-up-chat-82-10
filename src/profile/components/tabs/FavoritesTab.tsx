import React from 'react';
import { Bookmark } from 'lucide-react';

const FavoritesTab: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-full bg-yellow-100 dark:bg-yellow-950/20 flex items-center justify-center mb-4">
        <Bookmark size={32} className="text-yellow-600" />
      </div>
      <h3 className="text-lg font-semibold mb-2">Aucun favori</h3>
      <p className="text-sm text-muted-foreground">
        Vos contenus favoris apparaîtront ici
      </p>
    </div>
  );
};

export default FavoritesTab;
