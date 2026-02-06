/**
 * Dialog de composition de message style Gmail
 */
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Paperclip,
  Send,
  Trash2,
  ChevronDown,
  X,
  Minimize2,
  Maximize2,
  Image,
  Link2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ComposeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend: (data: {
    to: string[];
    subject: string;
    content: string;
    attachments: File[];
  }) => void;
  onSaveDraft: (data: {
    to: string[];
    subject: string;
    content: string;
  }) => void;
  replyTo?: {
    email: string;
    name: string;
    subject: string;
    content: string;
  };
}

export const ComposeDialog: React.FC<ComposeDialogProps> = ({
  open,
  onOpenChange,
  onSend,
  onSaveDraft,
  replyTo,
}) => {
  const [to, setTo] = useState(replyTo?.email || '');
  const [subject, setSubject] = useState(
    replyTo ? `Re: ${replyTo.subject}` : ''
  );
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const handleSend = () => {
    onSend({
      to: to.split(',').map((e) => e.trim()),
      subject,
      content,
      attachments,
    });
    resetForm();
    onOpenChange(false);
  };

  const handleSaveDraft = () => {
    onSaveDraft({
      to: to.split(',').map((e) => e.trim()),
      subject,
      content,
    });
    resetForm();
    onOpenChange(false);
  };

  const resetForm = () => {
    setTo('');
    setSubject('');
    setContent('');
    setAttachments([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments([...attachments, ...Array.from(e.target.files)]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-0 right-4 z-50">
        <div
          className="bg-card border rounded-t-lg shadow-lg cursor-pointer flex items-center gap-2 px-4 py-2 w-72"
          onClick={() => setIsMinimized(false)}
        >
          <span className="font-medium truncate flex-1">
            {subject || 'Nouveau message'}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(false);
            }}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              onOpenChange(false);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'sm:max-w-2xl p-0 gap-0',
          isFullScreen && 'sm:max-w-[90vw] sm:max-h-[90vh] h-[90vh]'
        )}
      >
        {/* Header */}
        <DialogHeader className="px-4 py-3 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-medium">
              Nouveau message
            </DialogTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setIsMinimized(true)}
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setIsFullScreen(!isFullScreen)}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Form */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* To */}
          <div className="flex items-center border-b px-4">
            <Label className="text-sm text-muted-foreground w-12">À</Label>
            <Input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="Destinataires (séparés par des virgules)"
              className="border-0 focus-visible:ring-0 px-0"
            />
          </div>

          {/* Subject */}
          <div className="flex items-center border-b px-4">
            <Label className="text-sm text-muted-foreground w-12">Objet</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Objet du message"
              className="border-0 focus-visible:ring-0 px-0"
            />
          </div>

          {/* Content */}
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Rédigez votre message..."
            className={cn(
              'flex-1 border-0 focus-visible:ring-0 resize-none rounded-none min-h-[200px]',
              isFullScreen && 'min-h-[400px]'
            )}
          />

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="px-4 py-2 border-t flex flex-wrap gap-2">
              {attachments.map((file, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="gap-1 pr-1"
                >
                  <Paperclip className="h-3 w-3" />
                  <span className="max-w-32 truncate">{file.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 ml-1"
                    onClick={() => removeAttachment(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/30">
          <div className="flex items-center gap-2">
            <Button onClick={handleSend} className="gap-2">
              <Send className="h-4 w-4" />
              Envoyer
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>Programmer l'envoi</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" asChild>
              <label className="cursor-pointer">
                <Paperclip className="h-4 w-4" />
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            </Button>
            <Button variant="ghost" size="icon">
              <Image className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <Link2 className="h-4 w-4" />
            </Button>
            <div className="w-px h-6 bg-border mx-2" />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSaveDraft}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
