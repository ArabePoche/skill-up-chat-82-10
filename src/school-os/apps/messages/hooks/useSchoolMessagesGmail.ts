/**
 * Hook pour gérer les messages de l'école style Gmail
 * Gère les dossiers, labels, et opérations sur les messages
 */
import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { SchoolMessage, MessageLabel, MessageView } from '../types';

// Labels par défaut pour les écoles
const DEFAULT_LABELS: MessageLabel[] = [
  { id: 'urgent', name: 'Urgent', color: 'red' },
  { id: 'parents', name: 'Parents', color: 'blue' },
  { id: 'teachers', name: 'Enseignants', color: 'green' },
  { id: 'admin', name: 'Administration', color: 'purple' },
  { id: 'events', name: 'Événements', color: 'orange' },
];

// Messages de démo pour l'interface
const DEMO_MESSAGES: SchoolMessage[] = [
  {
    id: '1',
    subject: 'Réunion parents-enseignants du 15 mars',
    content: '<p>Chers parents,</p><p>Nous avons le plaisir de vous inviter à la réunion parents-enseignants qui aura lieu le 15 mars à 18h dans la salle polyvalente.</p><p>Cordialement,<br/>La Direction</p>',
    sender: {
      id: 'admin1',
      name: 'Direction École',
      email: 'direction@ecole.com',
      role: 'admin',
    },
    recipients: [],
    labels: ['admin', 'events'],
    is_read: false,
    is_starred: true,
    is_draft: false,
    has_attachments: true,
    attachments: [
      { id: 'a1', name: 'planning_reunions.pdf', size: 245000, type: 'application/pdf', url: '#' },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    folder: 'inbox',
  },
  {
    id: '2',
    subject: 'Absence de votre enfant',
    content: '<p>Bonjour,</p><p>Nous souhaitons vous informer que votre enfant était absent aujourd\'hui.</p><p>Merci de nous fournir un justificatif.</p>',
    sender: {
      id: 'teacher1',
      name: 'Marie Dupont',
      email: 'marie.dupont@ecole.com',
      role: 'teacher',
    },
    recipients: [],
    labels: ['teachers'],
    is_read: true,
    is_starred: false,
    is_draft: false,
    has_attachments: false,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
    folder: 'inbox',
  },
  {
    id: '3',
    subject: 'Question sur les devoirs de mathématiques',
    content: '<p>Bonjour Madame,</p><p>Je me permets de vous contacter concernant les devoirs de mathématiques de cette semaine. Mon enfant rencontre des difficultés avec les fractions.</p><p>Serait-il possible d\'avoir des exercices supplémentaires ?</p><p>Merci d\'avance.</p>',
    sender: {
      id: 'parent1',
      name: 'Jean Martin',
      email: 'jean.martin@email.com',
      role: 'parent',
    },
    recipients: [],
    labels: ['parents'],
    is_read: false,
    is_starred: false,
    is_draft: false,
    has_attachments: false,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
    folder: 'inbox',
  },
  {
    id: '4',
    subject: 'Sortie scolaire - Autorisation parentale',
    content: '<p>Chers parents,</p><p>Nous organisons une sortie au musée le 20 mars. Veuillez remplir et retourner l\'autorisation ci-jointe.</p>',
    sender: {
      id: 'admin1',
      name: 'Direction École',
      email: 'direction@ecole.com',
      role: 'admin',
    },
    recipients: [],
    labels: ['admin', 'events', 'urgent'],
    is_read: false,
    is_starred: true,
    is_draft: false,
    has_attachments: true,
    attachments: [
      { id: 'a2', name: 'autorisation_sortie.pdf', size: 128000, type: 'application/pdf', url: '#' },
    ],
    created_at: new Date(Date.now() - 7200000).toISOString(),
    updated_at: new Date(Date.now() - 7200000).toISOString(),
    folder: 'inbox',
  },
];

export const useSchoolMessagesGmail = (schoolId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // États locaux
  const [currentView, setCurrentView] = useState<MessageView>('inbox');
  const [currentLabelId, setCurrentLabelId] = useState<string | undefined>();
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<SchoolMessage | null>(null);

  // Labels (utilise les labels par défaut pour l'instant)
  const [labels, setLabels] = useState<MessageLabel[]>(DEFAULT_LABELS);

  // Messages (utilise les messages de démo pour l'instant)
  const [messages, setMessages] = useState<SchoolMessage[]>(DEMO_MESSAGES);

  // Filtrer les messages selon la vue actuelle
  const filteredMessages = useMemo(() => {
    let result = messages;

    // Filtre par dossier/vue
    switch (currentView) {
      case 'inbox':
        result = result.filter((m) => m.folder === 'inbox' && !m.is_draft);
        break;
      case 'sent':
        result = result.filter((m) => m.folder === 'sent');
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

    // Filtre par recherche
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (m) =>
          m.subject.toLowerCase().includes(query) ||
          m.content.toLowerCase().includes(query) ||
          m.sender.name.toLowerCase().includes(query)
      );
    }

    // Trier par date (plus récent en premier)
    return result.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [messages, currentView, currentLabelId, searchQuery]);

  // Compteurs
  const counts = useMemo(() => {
    return {
      inbox: messages.filter((m) => m.folder === 'inbox' && !m.is_draft).length,
      inboxUnread: messages.filter(
        (m) => m.folder === 'inbox' && !m.is_draft && !m.is_read
      ).length,
      sent: messages.filter((m) => m.folder === 'sent').length,
      drafts: messages.filter((m) => m.is_draft || m.folder === 'drafts').length,
      trash: messages.filter((m) => m.folder === 'trash').length,
      starred: messages.filter((m) => m.is_starred).length,
      joinRequests: 0, // TODO: intégrer les vraies demandes
    };
  }, [messages]);

  // Actions
  const handleViewChange = useCallback((view: MessageView, labelId?: string) => {
    setCurrentView(view);
    setCurrentLabelId(labelId);
    setSelectedMessageIds([]);
    setSelectedMessage(null);
  }, []);

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelectedMessageIds(filteredMessages.map((m) => m.id));
      } else {
        setSelectedMessageIds([]);
      }
    },
    [filteredMessages]
  );

  const handleSelectMessage = useCallback((id: string, checked: boolean) => {
    setSelectedMessageIds((prev) =>
      checked ? [...prev, id] : prev.filter((i) => i !== id)
    );
  }, []);

  const handleStarToggle = useCallback((id: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, is_starred: !m.is_starred } : m))
    );
  }, []);

  const handleArchive = useCallback((ids: string[]) => {
    setMessages((prev) =>
      prev.map((m) =>
        ids.includes(m.id) ? { ...m, folder: 'archived' as const } : m
      )
    );
    setSelectedMessageIds([]);
    toast.success(`${ids.length} message(s) archivé(s)`);
  }, []);

  const handleDelete = useCallback((ids: string[]) => {
    setMessages((prev) =>
      prev.map((m) => (ids.includes(m.id) ? { ...m, folder: 'trash' } : m))
    );
    setSelectedMessageIds([]);
    toast.success(`${ids.length} message(s) supprimé(s)`);
  }, []);

  const handleMarkRead = useCallback((ids: string[], read: boolean) => {
    setMessages((prev) =>
      prev.map((m) => (ids.includes(m.id) ? { ...m, is_read: read } : m))
    );
    setSelectedMessageIds([]);
  }, []);

  const handleAddLabel = useCallback((ids: string[], labelId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        ids.includes(m.id) && !m.labels.includes(labelId)
          ? { ...m, labels: [...m.labels, labelId] }
          : m
      )
    );
    setSelectedMessageIds([]);
    toast.success('Libellé ajouté');
  }, []);

  const handleMessageClick = useCallback((message: SchoolMessage) => {
    setSelectedMessage(message);
    // Marquer comme lu
    setMessages((prev) =>
      prev.map((m) => (m.id === message.id ? { ...m, is_read: true } : m))
    );
  }, []);

  // Gestion des labels
  const handleCreateLabel = useCallback(
    (label: Omit<MessageLabel, 'id'>) => {
      const newLabel: MessageLabel = {
        ...label,
        id: `label-${Date.now()}`,
      };
      setLabels((prev) => [...prev, newLabel]);
      toast.success(`Libellé "${label.name}" créé`);
    },
    []
  );

  const handleUpdateLabel = useCallback(
    (id: string, updates: Partial<MessageLabel>) => {
      setLabels((prev) =>
        prev.map((l) => (l.id === id ? { ...l, ...updates } : l))
      );
    },
    []
  );

  const handleDeleteLabel = useCallback((id: string) => {
    setLabels((prev) => prev.filter((l) => l.id !== id));
    // Retirer le label de tous les messages
    setMessages((prev) =>
      prev.map((m) => ({
        ...m,
        labels: m.labels.filter((l) => l !== id),
      }))
    );
    toast.success('Libellé supprimé');
  }, []);

  // Composition
  const handleSendMessage = useCallback(
    (data: { to: string[]; subject: string; content: string; attachments: File[] }) => {
      const newMessage: SchoolMessage = {
        id: `msg-${Date.now()}`,
        subject: data.subject,
        content: `<p>${data.content.replace(/\n/g, '</p><p>')}</p>`,
        sender: {
          id: user?.id || '',
          name: 'Moi',
          email: user?.email || '',
          role: 'admin',
        },
        recipients: data.to.map((email) => ({
          id: email,
          name: email,
          email,
        })),
        labels: [],
        is_read: true,
        is_starred: false,
        is_draft: false,
        has_attachments: data.attachments.length > 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        folder: 'sent',
      };
      setMessages((prev) => [newMessage, ...prev]);
      toast.success('Message envoyé');
    },
    [user]
  );

  const handleSaveDraft = useCallback(
    (data: { to: string[]; subject: string; content: string }) => {
      const newDraft: SchoolMessage = {
        id: `draft-${Date.now()}`,
        subject: data.subject || '(Sans objet)',
        content: `<p>${data.content.replace(/\n/g, '</p><p>')}</p>`,
        sender: {
          id: user?.id || '',
          name: 'Moi',
          email: user?.email || '',
          role: 'admin',
        },
        recipients: data.to.map((email) => ({
          id: email,
          name: email,
          email,
        })),
        labels: [],
        is_read: true,
        is_starred: false,
        is_draft: true,
        has_attachments: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        folder: 'drafts',
      };
      setMessages((prev) => [newDraft, ...prev]);
      toast.success('Brouillon enregistré');
    },
    [user]
  );

  return {
    // État
    currentView,
    currentLabelId,
    selectedMessageIds,
    searchQuery,
    selectedMessage,
    labels,
    messages: filteredMessages,
    counts,
    isLoading: false,

    // Actions de navigation
    handleViewChange,
    setSearchQuery,
    setSelectedMessage,

    // Actions sur les messages
    handleSelectAll,
    handleSelectMessage,
    handleStarToggle,
    handleArchive,
    handleDelete,
    handleMarkRead,
    handleAddLabel,
    handleMessageClick,

    // Actions sur les labels
    handleCreateLabel,
    handleUpdateLabel,
    handleDeleteLabel,

    // Composition
    handleSendMessage,
    handleSaveDraft,
  };
};
