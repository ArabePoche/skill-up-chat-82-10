/** Message transférable vers conversation_messages (+ conversation_media optionnel) */

export interface ForwardableMedia {
  file_url: string;
  file_type: string;
  file_name: string;
  file_size?: number;
  duration_seconds?: number;
}

export interface ForwardableMessage {
  id: string;
  content: string;
  conversation_media?: ForwardableMedia[];
}
