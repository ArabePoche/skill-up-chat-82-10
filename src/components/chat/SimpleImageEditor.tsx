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
        variant="secondary"
        size="sm"
        onClick={() => setIsEditorOpen(true)}
        className="bg-white/90 hover:bg-white shadow-sm"
        title="Éditer l'image"
      >
        <Edit3 size={14} />
      </Button>

      {isEditorOpen && (
        <ModernImageEditor
          imageUrl={fileUrl}
          onSave={handleSaveEdit}
          onClose={() => setIsEditorOpen(false)}
        />
      )}
    </>
  );
};

export default SimpleImageEditor;