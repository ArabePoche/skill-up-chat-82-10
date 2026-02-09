/**
 * Vue détaillée d'un message style Gmail
 * Supporte les messages normaux et les demandes d'adhésion
 */
import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowLeft, Archive, Trash2, Star, Reply, ReplyAll, Forward,
  MoreVertical, Printer, Download, Tag, Paperclip, ChevronDown,
  Check, X, UserPlus, GraduationCap, BookOpen, Users,
} from 'lucide-react';
import { SchoolMessage, MessageLabel } from '../types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import ParentApprovalStudentSelector from '@/school-os/families/components/ParentApprovalStudentSelector';

interface MessageDetailProps {
  message: SchoolMessage;
  labels: MessageLabel[];
  onBack: () => void;
  onReply: () => void;
  onReplyAll: () => void;
  onForward: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onStarToggle: () => void;
  onAddLabel: (labelId: string) => void;
  onApproveJoinRequest?: (requestId: string) => void;
  onRejectJoinRequest?: (requestId: string, reason?: string) => void;
}

const getLabelColor = (color: string) => {
  const colorMap: Record<string, string> = {
    red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    pink: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
    gray: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  };
  return colorMap[color] || 'bg-muted text-muted-foreground';
};

const getRoleLabel = (role: string) => {
  const map: Record<string, string> = {
    teacher: 'Enseignant', parent: 'Parent', student: 'Élève', admin: 'Administration', staff: 'Personnel',
  };
  return map[role] || role;
};

const getTeacherTypeLabel = (type: string) => type === 'generalist' ? 'Généraliste' : type === 'specialist' ? 'Spécialiste' : type;

export const MessageDetail: React.FC<MessageDetailProps> = ({
  message, labels, onBack, onReply, onReplyAll, onForward,
  onArchive, onDelete, onStarToggle, onAddLabel,
  onApproveJoinRequest, onRejectJoinRequest,
}) => {
  const messageLabels = labels.filter((l) => message.labels.includes(l.id));
  const [expanded, setExpanded] = React.useState(true);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [showStudentSelector, setShowStudentSelector] = useState(false);

  const getInitials = (name: string) => name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const isJoinRequest = message.is_join_request;
  const formData = message.join_request_form_data || {};

  return (
    <div className="flex-1 flex flex-col h-full bg-background">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/30">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Separator orientation="vertical" className="h-6" />
        {!isJoinRequest && (
          <>
            <Button variant="ghost" size="icon" onClick={onArchive}><Archive className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon"><Tag className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {labels.map((label) => (
                  <DropdownMenuItem key={label.id} onClick={() => onAddLabel(label.id)}>
                    <span className={cn('h-3 w-3 rounded-full mr-2', `bg-${label.color}-500`)} />
                    {label.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
        {isJoinRequest && (
          <Badge variant="outline" className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 gap-1">
            <UserPlus className="h-3 w-3" />
            Demande d'adhésion
          </Badge>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem><Printer className="h-4 w-4 mr-2" />Imprimer</DropdownMenuItem>
            <DropdownMenuItem><Download className="h-4 w-4 mr-2" />Télécharger</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="max-w-4xl mx-auto p-6">
          {/* Subject */}
          <div className="flex items-start gap-4 mb-6">
            <h1 className="text-2xl font-semibold flex-1">{message.subject}</h1>
            {!isJoinRequest && (
              <Button variant="ghost" size="icon" onClick={onStarToggle} className="flex-shrink-0">
                <Star className={cn('h-5 w-5', message.is_starred ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground')} />
              </Button>
            )}
          </div>

          {/* Labels */}
          {messageLabels.length > 0 && (
            <div className="flex gap-2 mb-4">
              {messageLabels.map((label) => (
                <Badge key={label.id} className={getLabelColor(label.color)}>{label.name}</Badge>
              ))}
            </div>
          )}

          {/* Message card */}
          <div className="border rounded-lg bg-card">
            {/* Sender header */}
            <div className="flex items-start gap-4 p-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
              <Avatar className="h-10 w-10">
                <AvatarImage src={message.sender.avatar_url} />
                <AvatarFallback>{getInitials(message.sender.name)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{message.sender.name}</span>
                  {message.sender.email && <span className="text-sm text-muted-foreground">&lt;{message.sender.email}&gt;</span>}
                  {isJoinRequest && message.join_request_role && (
                    <Badge variant="outline" className="text-xs">{getRoleLabel(message.join_request_role)}</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {!isJoinRequest && <span>à moi</span>}
                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}>
                    <ChevronDown className={cn('h-3 w-3 transition-transform', expanded && 'rotate-180')} />
                  </Button>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                {format(new Date(message.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
              </div>
              {!isJoinRequest && (
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={onReply}><Reply className="h-4 w-4" /></Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={onReply}><Reply className="h-4 w-4 mr-2" />Répondre</DropdownMenuItem>
                      <DropdownMenuItem onClick={onReplyAll}><ReplyAll className="h-4 w-4 mr-2" />Répondre à tous</DropdownMenuItem>
                      <DropdownMenuItem onClick={onForward}><Forward className="h-4 w-4 mr-2" />Transférer</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>

            {/* Message content */}
            {expanded && (
              <>
                <Separator />
                <div className="p-6">
                  <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: message.content }} />
                </div>

                {/* Join request details */}
                {isJoinRequest && (
                  <>
                    <Separator />
                    <div className="p-6 space-y-4">
                      {/* Teacher-specific details */}
                      {message.join_request_role === 'teacher' && formData.teacherType && (
                        <div className="rounded-lg bg-muted/50 p-4 space-y-3">
                          <h4 className="font-medium flex items-center gap-2">
                            <GraduationCap className="h-4 w-4" /> Détails enseignant
                          </h4>
                          <div className="text-sm space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Type :</span>
                              <Badge variant="outline">{getTeacherTypeLabel(formData.teacherType)}</Badge>
                            </div>
                            {formData.teacherType === 'generalist' && formData.className && (
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">Classe :</span>
                                <Badge variant="secondary">{formData.className}</Badge>
                              </div>
                            )}
                            {formData.teacherType === 'specialist' && (formData.subjectName || formData.specialty) && (
                              <div className="flex items-center gap-2">
                                <BookOpen className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">Matière :</span>
                                <Badge variant="secondary">{formData.subjectName || formData.specialty}</Badge>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Action buttons for pending requests */}
                      {message.join_request_status === 'pending' && onApproveJoinRequest && onRejectJoinRequest && (
                        <div className="space-y-3">
                          {/* Si c'est un parent et que le sélecteur d'élèves est visible */}
                          {message.join_request_role === 'parent' && showStudentSelector && message.join_request_school_id && (
                            <div className="rounded-lg border p-4 bg-muted/30">
                              <h4 className="font-medium mb-3 flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                Sélectionner les élèves à associer au parent
                              </h4>
                              <ParentApprovalStudentSelector
                                schoolId={message.join_request_school_id}
                                joinRequestId={message.join_request_id!}
                                parentUserId={message.join_request_user_id || message.sender.id}
                                onComplete={() => {
                                  setShowStudentSelector(false);
                                  // Invalider les requêtes pour rafraîchir
                                }}
                                onCancel={() => setShowStudentSelector(false)}
                              />
                            </div>
                          )}

                          {/* Boutons d'action */}
                          {!showStudentSelector && (
                            <div className="flex items-center gap-3">
                              <Button
                                onClick={() => {
                                  if (message.join_request_role === 'parent') {
                                    setShowStudentSelector(true);
                                  } else {
                                    onApproveJoinRequest(message.join_request_id!);
                                  }
                                }}
                                className="gap-2 bg-green-600 hover:bg-green-700"
                              >
                                <Check className="h-4 w-4" /> Approuver
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => setShowRejectInput(!showRejectInput)}
                                className="gap-2 border-destructive text-destructive hover:bg-destructive/10"
                              >
                                <X className="h-4 w-4" /> Refuser
                              </Button>
                            </div>
                          )}
                          {showRejectInput && (
                            <div className="space-y-2">
                              <Textarea
                                placeholder="Raison du refus (optionnel)..."
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                className="min-h-[80px]"
                              />
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => onRejectJoinRequest(message.join_request_id!, rejectReason || undefined)}
                              >
                                Confirmer le refus
                              </Button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Status badges */}
                      {message.join_request_status === 'approved' && (
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          <Check className="h-3 w-3 mr-1" /> Approuvée
                        </Badge>
                      )}
                      {message.join_request_status === 'rejected' && (
                        <Badge variant="destructive">
                          <X className="h-3 w-3 mr-1" /> Refusée
                        </Badge>
                      )}
                    </div>
                  </>
                )}

                {/* Attachments */}
                {message.has_attachments && message.attachments && (
                  <>
                    <Separator />
                    <div className="p-4">
                      <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                        <Paperclip className="h-4 w-4" />
                        {message.attachments.length} pièce{message.attachments.length > 1 ? 's' : ''} jointe{message.attachments.length > 1 ? 's' : ''}
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {message.attachments.map((attachment) => (
                          <a key={attachment.id} href={attachment.url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted transition-colors">
                            <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                              <Paperclip className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{attachment.name}</p>
                              <p className="text-xs text-muted-foreground">{(attachment.size / 1024).toFixed(1)} Ko</p>
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {/* Reply actions (only for normal messages) */}
          {!isJoinRequest && (
            <div className="flex items-center gap-3 mt-6">
              <Button variant="outline" className="gap-2" onClick={onReply}><Reply className="h-4 w-4" />Répondre</Button>
              <Button variant="outline" className="gap-2" onClick={onForward}><Forward className="h-4 w-4" />Transférer</Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
