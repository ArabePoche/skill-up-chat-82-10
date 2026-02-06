/**
 * Types pour l'application de messagerie école style Gmail
 */

export interface MessageLabel {
  id: string;
  name: string;
  color: string;
  icon?: string;
}

export interface SchoolMessage {
  id: string;
  subject: string;
  content: string;
  sender: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
    role: 'teacher' | 'parent' | 'admin' | 'student';
  };
  recipients: Array<{
    id: string;
    name: string;
    email: string;
  }>;
  labels: string[];
  is_read: boolean;
  is_starred: boolean;
  is_draft: boolean;
  has_attachments: boolean;
  attachments?: Array<{
    id: string;
    name: string;
    size: number;
    type: string;
    url: string;
  }>;
  created_at: string;
  updated_at: string;
  folder: 'inbox' | 'sent' | 'drafts' | 'trash' | 'archived';
  thread_id?: string;
  reply_to?: string;
}

export interface MessageFolder {
  id: string;
  name: string;
  icon: string;
  count: number;
  unread: number;
}

export type MessageView = 'inbox' | 'sent' | 'drafts' | 'trash' | 'starred' | 'label';
