// Utilitaire: encode et decode les rapports d'appel stockes dans conversation_messages.
export const CALL_LOG_PREFIX = '[call-log]';

export const createCallLogContent = (label: string) => {
  return `${CALL_LOG_PREFIX} ${label}`;
};

export const parseCallLogContent = (content?: string | null) => {
  if (!content?.startsWith(CALL_LOG_PREFIX)) {
    return null;
  }

  return content.slice(CALL_LOG_PREFIX.length).trim();
};