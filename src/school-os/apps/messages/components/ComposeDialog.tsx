/**
 * Dialog de composition de message style Gmail
 * Avec sélection de membres par recherche et par groupe
 */
import React, { useState, useMemo } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Paperclip, Send, Trash2, ChevronDown, X, Minimize2, Maximize2,
  Image, Link2, Search, Users, GraduationCap, Briefcase, User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSchoolMembers } from '../hooks/useSchoolMembers';
import { useSchoolYear } from '@/school/context/SchoolYearContext';
import { useSchoolUserRole } from '@/school-os/hooks/useSchoolUserRole';
import { SchoolMember } from '../types';

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

const roleIcons: Record<string, React.ElementType> = {
  admin: Briefcase,
  owner: Briefcase,
  teacher: GraduationCap,
  staff: Briefcase,
  secretary: Briefcase,
  parent: Users,
  student: User,
  member: User,
};

const roleLabels: Record<string, string> = {
  admin: 'Admin',
  owner: 'Admin',
  teacher: 'Enseignant',
  staff: 'Personnel',
  secretary: 'Secrétaire',
  parent: 'Parent',
  student: 'Élève',
  member: 'Membre',
};

export const ComposeDialog: React.FC<ComposeDialogProps> = ({
  open, onOpenChange, onSend, onSaveDraft, replyTo,
}) => {
  const { school, activeSchoolYear } = useSchoolYear();
  const { data: roleData } = useSchoolUserRole(school?.id);
  const isParent = roleData?.isParent || false;
  const { members, filteredMembers, groups, searchQuery, setSearchQuery, isLoading } = useSchoolMembers(school?.id, {
    isParent,
    schoolYearId: activeSchoolYear?.id,
  });
  
  const [selectedRecipients, setSelectedRecipients] = useState<SchoolMember[]>([]);
  const [subject, setSubject] = useState(replyTo ? `Re: ${replyTo.subject}` : '');
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [recipientPopoverOpen, setRecipientPopoverOpen] = useState(false);

  const addRecipient = (member: SchoolMember) => {
    if (!selectedRecipients.find((r) => r.id === member.id)) {
      setSelectedRecipients((prev) => [...prev, member]);
    }
    setSearchQuery('');
  };

  const removeRecipient = (id: string) => {
    setSelectedRecipients((prev) => prev.filter((r) => r.id !== id));
  };

  const addGroupRecipients = (groupKey: string) => {
    const group = groups.find((g) => g.key === groupKey);
    if (group) {
      const newMembers = group.members.filter(
        (m) => !selectedRecipients.find((r) => r.id === m.id)
      );
      setSelectedRecipients((prev) => [...prev, ...newMembers]);
    }
  };

  const handleSend = () => {
    if (selectedRecipients.length === 0) return;
    onSend({
      to: selectedRecipients.map((r) => r.id),
      subject,
      content,
      attachments,
    });
    resetForm();
    onOpenChange(false);
  };

  const handleSaveDraft = () => {
    onSaveDraft({
      to: selectedRecipients.map((r) => r.id),
      subject,
      content,
    });
    resetForm();
    onOpenChange(false);
  };

  const resetForm = () => {
    setSelectedRecipients([]);
    setSubject('');
    setContent('');
    setAttachments([]);
    setSearchQuery('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments([...attachments, ...Array.from(e.target.files)]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  // Members not already selected
  const availableMembers = useMemo(() => {
    return filteredMembers.filter((m) => !selectedRecipients.find((r) => r.id === m.id));
  }, [filteredMembers, selectedRecipients]);

  if (isMinimized) {
    return (
      <div className="fixed bottom-0 right-4 z-50">
        <div
          className="bg-card border rounded-t-lg shadow-lg cursor-pointer flex items-center gap-2 px-4 py-2 w-72"
          onClick={() => setIsMinimized(false)}
        >
          <span className="font-medium truncate flex-1">{subject || 'Nouveau message'}</span>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); setIsMinimized(false); }}>
            <Maximize2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onOpenChange(false); }}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('sm:max-w-2xl p-0 gap-0', isFullScreen && 'sm:max-w-[90vw] sm:max-h-[90vh] h-[90vh]')}>
        {/* Header */}
        <DialogHeader className="px-4 py-3 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-medium">Nouveau message</DialogTitle>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsMinimized(true)}>
                <Minimize2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsFullScreen(!isFullScreen)}>
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Recipients */}
          <div className="flex items-start gap-2 border-b px-4 py-2">
            <Label className="text-sm text-muted-foreground w-12 pt-1.5">À</Label>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                {selectedRecipients.map((r) => {
                  const RoleIcon = roleIcons[r.role] || User;
                  return (
                    <Badge key={r.id} variant="secondary" className="gap-1 pr-1">
                      <RoleIcon className="h-3 w-3" />
                      <span className="max-w-24 truncate">{r.name}</span>
                      <Button variant="ghost" size="icon" className="h-4 w-4 ml-0.5" onClick={() => removeRecipient(r.id)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  );
                })}
              </div>

              {isParent ? (
                /* Mode parent: sélecteur direct de membres (pas de recherche) */
                <ScrollArea className="max-h-40">
                  <div className="space-y-0.5">
                    {isLoading ? (
                      <p className="text-sm text-muted-foreground p-2">Chargement...</p>
                    ) : availableMembers.length === 0 ? (
                      <p className="text-sm text-muted-foreground p-2">
                        {selectedRecipients.length > 0 ? 'Tous les membres sont sélectionnés' : 'Aucun membre disponible'}
                      </p>
                    ) : (
                      availableMembers.map((member) => {
                        const RoleIcon = roleIcons[member.role] || User;
                        return (
                          <button
                            key={member.id}
                            className="w-full flex items-center gap-3 px-2 py-1.5 rounded hover:bg-muted text-left transition-colors"
                            onClick={() => addRecipient(member)}
                          >
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={member.avatar_url} />
                              <AvatarFallback className="text-[10px]">
                                {member.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{member.name}</p>
                            </div>
                            <Badge variant="outline" className="text-[10px] gap-0.5 h-5">
                              <RoleIcon className="h-3 w-3" />
                              {roleLabels[member.role] || member.role}
                            </Badge>
                          </button>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              ) : (
                /* Mode non-parent: recherche avec popover */
                <div className="flex items-center gap-2">
                  <Popover open={recipientPopoverOpen} onOpenChange={setRecipientPopoverOpen}>
                    <PopoverTrigger asChild>
                      <div className="flex-1 relative">
                        <Input
                          value={searchQuery}
                          onChange={(e) => {
                            setSearchQuery(e.target.value);
                            if (!recipientPopoverOpen) setRecipientPopoverOpen(true);
                          }}
                          onFocus={() => setRecipientPopoverOpen(true)}
                          placeholder="Rechercher un membre..."
                          className="border-0 focus-visible:ring-0 px-0 h-8"
                        />
                      </div>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
                      <ScrollArea className="max-h-64">
                        {/* Group buttons */}
                        {groups.length > 0 && !searchQuery.trim() && (
                          <div className="p-2 border-b">
                            <p className="text-xs text-muted-foreground px-2 mb-1.5">Envoyer à un groupe</p>
                            <div className="flex flex-wrap gap-1">
                              {groups.map((g) => {
                                const Icon = roleIcons[g.key] || Users;
                                return (
                                  <Button
                                    key={g.key}
                                    variant="outline"
                                    size="sm"
                                    className="gap-1 text-xs h-7"
                                    onClick={() => { addGroupRecipients(g.key); }}
                                  >
                                    <Icon className="h-3 w-3" />
                                    Tous les {g.label.toLowerCase()} ({g.members.length})
                                  </Button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        {/* Individual members */}
                        <div className="p-1">
                          {availableMembers.length === 0 ? (
                            <p className="text-sm text-muted-foreground p-3 text-center">
                              {isLoading ? 'Chargement...' : 'Aucun membre trouvé'}
                            </p>
                          ) : (
                            availableMembers.slice(0, 20).map((member) => {
                              const RoleIcon = roleIcons[member.role] || User;
                              return (
                                <button
                                  key={member.id}
                                  className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-muted text-left transition-colors"
                                  onClick={() => { addRecipient(member); }}
                                >
                                  <Avatar className="h-7 w-7">
                                    <AvatarImage src={member.avatar_url} />
                                    <AvatarFallback className="text-xs">
                                      {member.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{member.name}</p>
                                    <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                                  </div>
                                  <Badge variant="outline" className="text-[10px] gap-0.5 h-5">
                                    <RoleIcon className="h-3 w-3" />
                                    {roleLabels[member.role] || member.role}
                                  </Badge>
                                </button>
                              );
                            })
                          )}
                        </div>
                      </ScrollArea>
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>
          </div>

          {/* Subject */}
          <div className="flex items-center border-b px-4">
            <Label className="text-sm text-muted-foreground w-12">Objet</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Objet du message" className="border-0 focus-visible:ring-0 px-0" />
          </div>

          {/* Content */}
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Rédigez votre message..."
            className={cn('flex-1 border-0 focus-visible:ring-0 resize-none rounded-none min-h-[200px]', isFullScreen && 'min-h-[400px]')}
          />

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="px-4 py-2 border-t flex flex-wrap gap-2">
              {attachments.map((file, index) => (
                <Badge key={index} variant="secondary" className="gap-1 pr-1">
                  <Paperclip className="h-3 w-3" />
                  <span className="max-w-32 truncate">{file.name}</span>
                  <Button variant="ghost" size="icon" className="h-4 w-4 ml-1" onClick={() => removeAttachment(index)}>
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
            <Button onClick={handleSend} className="gap-2" disabled={selectedRecipients.length === 0}>
              <Send className="h-4 w-4" />
              Envoyer
            </Button>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" asChild>
              <label className="cursor-pointer">
                <Paperclip className="h-4 w-4" />
                <input type="file" multiple className="hidden" onChange={handleFileChange} />
              </label>
            </Button>
            <Button variant="ghost" size="icon"><Image className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon"><Link2 className="h-4 w-4" /></Button>
            <div className="w-px h-6 bg-border mx-2" />
            <Button variant="ghost" size="icon" onClick={handleSaveDraft}><Trash2 className="h-4 w-4" /></Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
