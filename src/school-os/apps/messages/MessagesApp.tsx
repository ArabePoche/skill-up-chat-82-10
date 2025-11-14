// Application de messagerie
import React from 'react';

export const MessagesApp: React.FC = () => {
  return (
    <div className="p-6 h-full overflow-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Messages</h2>
          <p className="text-muted-foreground mt-1">
            Communiquez avec les enseignants, élèves et parents
          </p>
        </div>
      </div>
      {/* TODO: Implémenter l'interface de messagerie */}
    </div>
  );
};
