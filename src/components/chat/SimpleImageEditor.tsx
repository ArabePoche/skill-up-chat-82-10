import React, { useState } from 'react';
import { X, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ModernImageEditor from './ModernImageEditor';

interface SimpleImageEditorProps {
  fileUrl: string;
  fileName: string;
  onUpdate: (newUrl: string) => void;
}

const SimpleImageEditor: React.FC<SimpleImageEditorProps> = ({
  fileUrl,
  fileName,
  onUpdate
}) => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const handleSaveEdit = (editedImageUrl: string) => {
    onUpdate(editedImageUrl);
    setIsEditorOpen(false);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          console.log('Opening image editor for:', fileUrl);
          setIsEditorOpen(true);
        }}
        className="p-1.5 h-auto"
        title="Éditer l'image"
      >
        <Edit3 size={14} />
      </Button>

      {isEditorOpen && (
        <div className="fixed inset-0 z-50 bg-black/80">
          <ModernImageEditor
            imageUrl={fileUrl}
            onSave={handleSaveEdit}
            onClose={() => setIsEditorOpen(false)}
          />
        </div>
      )}
    </>
  );
};

export default SimpleImageEditor;