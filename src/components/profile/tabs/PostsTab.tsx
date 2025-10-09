import React from 'react';
import { FileText } from 'lucide-react';

const PostsTab: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <FileText size={32} className="text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">Aucun post</h3>
      <p className="text-sm text-muted-foreground">
        Vos posts apparaîtront ici
      </p>
    </div>
  );
};

export default PostsTab;
