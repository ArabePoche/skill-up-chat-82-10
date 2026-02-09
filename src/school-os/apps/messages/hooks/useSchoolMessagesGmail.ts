/**
 * Hook pour gérer les messages de l'école style Gmail
 * Connecté aux tables Supabase + demandes d'adhésion intégrées
 * Admin voit tout, autres voient uniquement les messages qui les concernent
 */
import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSchoolUserRole } from '@/school-os/hooks/useSchoolUserRole';
import { toast } from 'sonner';
import { SchoolMessage, MessageLabel, MessageView } from '../types';

export const useSchoolMessagesGmail = (schoolId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: roleData } = useSchoolUserRole(schoolId);

  const isAdmin = roleData?.isOwner || roleData?.isAdmin;

  // États locaux UI
  const [currentView, setCurrentView] = useState<MessageView>('inbox');
  const [currentLabelId, setCurrentLabelId] = useState<string | undefined>();
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<SchoolMessage | null>(null);

  // --- Fetch labels depuis Supabase ---
  const { data: dbLabels = [] } = useQuery({
    queryKey: ['school-message-labels', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const { data, error } = await (supabase as any)
        .from('school_message_labels')
        .select('*')
        .eq('school_id', schoolId)
        .order('name');
      if (error) throw error;
      return (data || []).map((l: any) => ({
        id: l.id,
        name: l.name,
        color: l.color || 'gray',
      })) as MessageLabel[];
    },
    enabled: !!schoolId,
  });

  // --- Fetch messages depuis Supabase ---
  const { data: dbMessages = [], isLoading: isLoadingMessages } = useQuery({
    queryKey: ['school-messages', schoolId, user?.id, isAdmin],
    queryFn: async () => {
      if (!schoolId || !user?.id) return [];

      // Fetch all messages for school
      const { data: allMessages, error } = await (supabase as any)
        .from('school_messages')
        .select(`
          *,
          school_message_attachments(*),
          school_message_label_assignments(label_id),
          school_message_recipients(*)
        `)
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter based on role: admin sees all, others see only their messages
      let filteredMsgs = allMessages || [];
      if (!isAdmin) {
        filteredMsgs = filteredMsgs.filter((msg: any) => {
          const isSender = msg.sender_id === user.id;
          const isRecipient = (msg.school_message_recipients || []).some(
            (r: any) => r.recipient_id === user.id
          );
          return isSender || isRecipient;
        });
      }

      // Collect all user IDs for profile lookup
      const senderIds = filteredMsgs.map((m: any) => m.sender_id);
      const recipientIds = filteredMsgs.flatMap((m: any) =>
        (m.school_message_recipients || []).map((r: any) => r.recipient_id)
      );
      const allUserIds = [...new Set([...senderIds, ...recipientIds])].filter(Boolean) as string[];

      let profilesMap: Record<string, any> = {};
      if (allUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, username, avatar_url, email')
          .in('id', allUserIds);
        if (profiles) {
          profiles.forEach((p) => { profilesMap[p.id] = p; });
        }
      }

      return filteredMsgs.map((msg: any): SchoolMessage => {
        const senderProfile = profilesMap[msg.sender_id];
        const recipients = (msg.school_message_recipients || []).map((r: any) => {
          const rProfile = profilesMap[r.recipient_id];
          return {
            id: r.recipient_id,
            name: rProfile ? `${rProfile.first_name || ''} ${rProfile.last_name || ''}`.trim() || rProfile.username || '' : '',
            email: rProfile?.email || '',
          };
        });
        const labelIds = (msg.school_message_label_assignments || []).map((la: any) => la.label_id);
        const attachments = (msg.school_message_attachments || []).map((a: any) => ({
          id: a.id, name: a.file_name, size: a.file_size || 0, type: a.file_type, url: a.file_url,
        }));

        // Determine folder for current user
        let folder: SchoolMessage['folder'] = msg.folder || 'inbox';
        const isRecipient = recipients.some((r: any) => r.id === user?.id);
        const isSender = msg.sender_id === user?.id;
        if (isRecipient) {
          const recipientEntry = (msg.school_message_recipients || []).find((r: any) => r.recipient_id === user?.id);
          if (recipientEntry?.folder) folder = recipientEntry.folder;
        }
        if (isSender && !isRecipient && folder === 'inbox') folder = 'sent';

        // Read/star status for current user
        let isRead = msg.is_read;
        let isStarred = msg.is_starred;
        if (isRecipient) {
          const recipientEntry = (msg.school_message_recipients || []).find((r: any) => r.recipient_id === user?.id);
          if (recipientEntry) {
            isRead = recipientEntry.is_read ?? msg.is_read;
            isStarred = recipientEntry.is_starred ?? msg.is_starred;
          }
        }

        return {
          id: msg.id, subject: msg.subject, content: msg.content,
          sender: {
            id: msg.sender_id,
            name: senderProfile ? `${senderProfile.first_name || ''} ${senderProfile.last_name || ''}`.trim() || senderProfile.username || 'Inconnu' : 'Inconnu',
            email: senderProfile?.email || '',
            avatar_url: senderProfile?.avatar_url,
            role: 'admin',
          },
          recipients, labels: labelIds,
          is_read: isRead, is_starred: isStarred, is_draft: msg.is_draft,
          has_attachments: msg.has_attachments, attachments,
          created_at: msg.created_at, updated_at: msg.updated_at,
          folder, thread_id: msg.thread_id, reply_to: msg.reply_to,
        };
      });
    },
    enabled: !!schoolId && !!user?.id,
  });

  // --- Fetch join requests as messages (only for admins) ---
  const { data: joinRequestMessages = [], isLoading: isLoadingJoinRequests } = useQuery({
    queryKey: ['school-join-requests-as-messages', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];

      const { data, error } = await supabase
        .from('school_join_requests')
        .select(`
          *,
          user:profiles!school_join_requests_user_id_fkey(
            id, first_name, last_name, email, avatar_url
          )
        `)
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((req: any): SchoolMessage => {
        const sender = req.user;
        const roleLabelMap: Record<string, string> = {
          teacher: 'Enseignant',
          parent: 'Parent',
          student: 'Élève',
        };
        const roleLabel = roleLabelMap[req.role] || req.role;
        const formData = req.form_data || {};

        let contentParts = [`<p><strong>Demande d'adhésion en tant que ${roleLabel}</strong></p>`];
        if (req.role === 'teacher' && formData.teacherType) {
          contentParts.push(`<p>Type : ${formData.teacherType === 'generalist' ? 'Généraliste' : 'Spécialiste'}</p>`);
          if (formData.className) contentParts.push(`<p>Classe : ${formData.className}</p>`);
          if (formData.subjectName) contentParts.push(`<p>Matière : ${formData.subjectName}</p>`);
        }
        if (formData.class) contentParts.push(`<p>Classe : ${formData.class}</p>`);
        if (formData.message) contentParts.push(`<p>Message : ${formData.message}</p>`);

        return {
          id: `join-${req.id}`,
          subject: `Demande d'adhésion — ${roleLabel} : ${sender?.first_name || ''} ${sender?.last_name || ''}`.trim(),
          content: contentParts.join(''),
          sender: {
            id: sender?.id || req.user_id,
            name: sender ? `${sender.first_name || ''} ${sender.last_name || ''}`.trim() || 'Inconnu' : 'Inconnu',
            email: sender?.email || '',
            avatar_url: sender?.avatar_url,
            role: (req.role as any) || 'student',
          },
          recipients: [],
          labels: [],
          is_read: req.status !== 'pending',
          is_starred: false,
          is_draft: false,
          has_attachments: false,
          created_at: req.created_at,
          updated_at: req.updated_at || req.created_at,
          folder: 'inbox',
          is_join_request: true,
          join_request_id: req.id,
          join_request_status: req.status,
          join_request_role: req.role,
          join_request_form_data: formData,
          join_request_school_id: schoolId,
          join_request_user_id: req.user_id,
        };
      });
    },
    enabled: !!schoolId && !!isAdmin,
  });

  // Merge all messages
  const allMessages = useMemo(() => {
    return [...dbMessages, ...joinRequestMessages].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [dbMessages, joinRequestMessages]);

  const isLoading = isLoadingMessages || isLoadingJoinRequests;

  // Filter messages by current view
  const filteredMessages = useMemo(() => {
    let result = allMessages;

    switch (currentView) {
      case 'inbox':
        result = result.filter((m) => m.folder === 'inbox' && !m.is_draft);
        break;
      case 'sent':
        result = result.filter((m) => m.folder === 'sent' || (m.sender.id === user?.id && !m.is_join_request));
        break;
      case 'drafts':
        result = result.filter((m) => m.is_draft || m.folder === 'drafts');
        break;
      case 'trash':
        result = result.filter((m) => m.folder === 'trash');
        break;
      case 'starred':
        result = result.filter((m) => m.is_starred);
        break;
      case 'label':
        if (currentLabelId) {
          result = result.filter((m) => m.labels.includes(currentLabelId));
        }
        break;
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (m) =>
          m.subject.toLowerCase().includes(query) ||
          m.content.toLowerCase().includes(query) ||
          m.sender.name.toLowerCase().includes(query)
      );
    }

    return result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [allMessages, currentView, currentLabelId, searchQuery, user?.id]);

  // Counts
  const counts = useMemo(() => {
    const inboxMsgs = allMessages.filter((m) => m.folder === 'inbox' && !m.is_draft);
    return {
      inbox: inboxMsgs.length,
      inboxUnread: inboxMsgs.filter((m) => !m.is_read).length,
      sent: allMessages.filter((m) => m.folder === 'sent' || (m.sender.id === user?.id && !m.is_join_request)).length,
      drafts: allMessages.filter((m) => m.is_draft || m.folder === 'drafts').length,
      trash: allMessages.filter((m) => m.folder === 'trash').length,
      starred: allMessages.filter((m) => m.is_starred).length,
      joinRequests: joinRequestMessages.filter((m) => m.join_request_status === 'pending').length,
    };
  }, [allMessages, joinRequestMessages, user?.id]);

  // --- Actions ---
  const handleViewChange = useCallback((view: MessageView, labelId?: string) => {
    setCurrentView(view);
    setCurrentLabelId(labelId);
    setSelectedMessageIds([]);
    setSelectedMessage(null);
  }, []);

  const handleSelectAll = useCallback(
    (checked: boolean) => { setSelectedMessageIds(checked ? filteredMessages.map((m) => m.id) : []); },
    [filteredMessages]
  );

  const handleSelectMessage = useCallback((id: string, checked: boolean) => {
    setSelectedMessageIds((prev) => checked ? [...prev, id] : prev.filter((i) => i !== id));
  }, []);

  const handleStarToggle = useCallback(async (id: string) => {
    if (id.startsWith('join-')) return; // Can't star join requests
    const msg = dbMessages.find((m) => m.id === id);
    if (!msg) return;
    const newStarred = !msg.is_starred;
    if (user?.id && msg.sender.id !== user.id) {
      await (supabase as any).from('school_message_recipients').update({ is_starred: newStarred }).eq('message_id', id).eq('recipient_id', user.id);
    } else {
      await (supabase as any).from('school_messages').update({ is_starred: newStarred }).eq('id', id);
    }
    queryClient.invalidateQueries({ queryKey: ['school-messages', schoolId] });
  }, [dbMessages, user?.id, schoolId, queryClient]);

  const handleArchive = useCallback(async (ids: string[]) => {
    const realIds = ids.filter(id => !id.startsWith('join-'));
    for (const id of realIds) {
      await (supabase as any).from('school_messages').update({ folder: 'archived' }).eq('id', id);
    }
    setSelectedMessageIds([]);
    queryClient.invalidateQueries({ queryKey: ['school-messages', schoolId] });
    toast.success(`${realIds.length} message(s) archivé(s)`);
  }, [schoolId, queryClient]);

  const handleDelete = useCallback(async (ids: string[]) => {
    const realIds = ids.filter(id => !id.startsWith('join-'));
    for (const id of realIds) {
      await (supabase as any).from('school_messages').update({ folder: 'trash' }).eq('id', id);
    }
    setSelectedMessageIds([]);
    queryClient.invalidateQueries({ queryKey: ['school-messages', schoolId] });
    toast.success(`${realIds.length} message(s) supprimé(s)`);
  }, [schoolId, queryClient]);

  const handleMarkRead = useCallback(async (ids: string[], read: boolean) => {
    const realIds = ids.filter(id => !id.startsWith('join-'));
    for (const id of realIds) {
      await (supabase as any).from('school_messages').update({ is_read: read }).eq('id', id);
    }
    setSelectedMessageIds([]);
    queryClient.invalidateQueries({ queryKey: ['school-messages', schoolId] });
  }, [schoolId, queryClient]);

  const handleAddLabel = useCallback(async (ids: string[], labelId: string) => {
    const realIds = ids.filter(id => !id.startsWith('join-'));
    for (const id of realIds) {
      await (supabase as any).from('school_message_label_assignments').upsert({ message_id: id, label_id: labelId }, { onConflict: 'message_id,label_id' });
    }
    setSelectedMessageIds([]);
    queryClient.invalidateQueries({ queryKey: ['school-messages', schoolId] });
    toast.success('Libellé ajouté');
  }, [schoolId, queryClient]);

  const handleMessageClick = useCallback(async (message: SchoolMessage) => {
    setSelectedMessage(message);
    if (!message.is_read && !message.is_join_request) {
      await (supabase as any).from('school_messages').update({ is_read: true }).eq('id', message.id);
      queryClient.invalidateQueries({ queryKey: ['school-messages', schoolId] });
    }
  }, [schoolId, queryClient]);

  // --- Join request actions ---
  const handleApproveJoinRequest = useCallback(async (requestId: string) => {
    if (!user?.id) return;
    const { error } = await supabase.rpc('approve_school_join_request', {
      p_request_id: requestId,
      p_reviewer_id: user.id,
    });
    if (error) {
      toast.error("Erreur lors de l'approbation");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['school-join-requests-as-messages', schoolId] });
    setSelectedMessage(null);
    toast.success('Demande approuvée avec succès');
  }, [user?.id, schoolId, queryClient]);

  const handleRejectJoinRequest = useCallback(async (requestId: string, reason?: string) => {
    if (!user?.id) return;
    const { error } = await supabase.rpc('reject_school_join_request', {
      p_request_id: requestId,
      p_reviewer_id: user.id,
      p_reason: reason || null,
    });
    if (error) {
      toast.error('Erreur lors du refus');
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['school-join-requests-as-messages', schoolId] });
    setSelectedMessage(null);
    toast.success('Demande refusée');
  }, [user?.id, schoolId, queryClient]);

  // --- Labels CRUD ---
  const handleCreateLabel = useCallback(async (label: Omit<MessageLabel, 'id'>) => {
    if (!schoolId || !user?.id) return;
    const { error } = await (supabase as any).from('school_message_labels').insert({ school_id: schoolId, name: label.name, color: label.color, created_by: user.id });
    if (error) { toast.error('Erreur lors de la création du libellé'); return; }
    queryClient.invalidateQueries({ queryKey: ['school-message-labels', schoolId] });
    toast.success(`Libellé "${label.name}" créé`);
  }, [schoolId, user?.id, queryClient]);

  const handleUpdateLabel = useCallback(async (id: string, updates: Partial<MessageLabel>) => {
    const { error } = await (supabase as any).from('school_message_labels').update({ name: updates.name, color: updates.color }).eq('id', id);
    if (error) { toast.error('Erreur lors de la modification du libellé'); return; }
    queryClient.invalidateQueries({ queryKey: ['school-message-labels', schoolId] });
  }, [schoolId, queryClient]);

  const handleDeleteLabel = useCallback(async (id: string) => {
    await (supabase as any).from('school_message_label_assignments').delete().eq('label_id', id);
    const { error } = await (supabase as any).from('school_message_labels').delete().eq('id', id);
    if (error) { toast.error('Erreur lors de la suppression du libellé'); return; }
    queryClient.invalidateQueries({ queryKey: ['school-message-labels', schoolId] });
    queryClient.invalidateQueries({ queryKey: ['school-messages', schoolId] });
    toast.success('Libellé supprimé');
  }, [schoolId, queryClient]);

  // --- Send message ---
  const handleSendMessage = useCallback(async (data: { to: string[]; subject: string; content: string; attachments: File[] }) => {
    if (!schoolId || !user?.id) return;
    const { data: newMsg, error } = await (supabase as any).from('school_messages').insert({
      school_id: schoolId, sender_id: user.id, subject: data.subject, content: data.content,
      folder: 'sent', is_read: true, is_starred: false, is_draft: false, has_attachments: data.attachments.length > 0,
    }).select().single();
    if (error) { toast.error("Erreur lors de l'envoi du message"); return; }
    if (data.to.length > 0 && newMsg) {
      const recipientRows = data.to.map((recipientId) => ({
        message_id: newMsg.id, recipient_id: recipientId, is_read: false, folder: 'inbox', is_starred: false,
      }));
      await (supabase as any).from('school_message_recipients').insert(recipientRows);
    }
    queryClient.invalidateQueries({ queryKey: ['school-messages', schoolId] });
    toast.success('Message envoyé');
  }, [schoolId, user?.id, queryClient]);

  const handleSaveDraft = useCallback(async (data: { to: string[]; subject: string; content: string }) => {
    if (!schoolId || !user?.id) return;
    const { error } = await (supabase as any).from('school_messages').insert({
      school_id: schoolId, sender_id: user.id, subject: data.subject || '(Sans objet)', content: data.content,
      folder: 'drafts', is_read: true, is_starred: false, is_draft: true, has_attachments: false,
    });
    if (error) { toast.error('Erreur lors de la sauvegarde du brouillon'); return; }
    queryClient.invalidateQueries({ queryKey: ['school-messages', schoolId] });
    toast.success('Brouillon enregistré');
  }, [schoolId, user?.id, queryClient]);

  return {
    currentView, currentLabelId, selectedMessageIds, searchQuery, selectedMessage,
    labels: dbLabels, messages: filteredMessages, counts, isLoading,
    handleViewChange, setSearchQuery, setSelectedMessage,
    handleSelectAll, handleSelectMessage, handleStarToggle,
    handleArchive, handleDelete, handleMarkRead, handleAddLabel, handleMessageClick,
    handleCreateLabel, handleUpdateLabel, handleDeleteLabel,
    handleSendMessage, handleSaveDraft,
    // Join request actions
    handleApproveJoinRequest, handleRejectJoinRequest,
  };
};
