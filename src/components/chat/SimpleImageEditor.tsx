import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Edit3 } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import ImageEditor from '@/components/image-editor/ImageEditor';

interface SimpleImageEditorProps {
  fileUrl: string;
  fileName: string;
  onUpdate?: (newUrl: string) => void;
}

const SimpleImageEditor: React.FC<SimpleImageEditorProps> = ({
  fileUrl,
  fileName,
  onUpdate
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSave = async (editedImageUrl: string) => {
    if (onUpdate) {
      onUpdate(editedImageUrl);
    }
    setIsOpen(false);
  };

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="bg-white/90 hover:bg-white shadow-sm p-1 sm:p-2"
        title="Éditer l'image"
      >
        <Edit3 size={14} className="sm:w-4 sm:h-4" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-[98vw] max-h-[98vh] w-full h-full p-0">
          <ImageEditor
            imageUrl={fileUrl}
            fileName={fileName}
            onSave={handleSave}
            onClose={() => setIsOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SimpleImageEditor;