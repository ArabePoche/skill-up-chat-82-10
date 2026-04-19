// Utilitaire: marque et nettoie les messages de conversation transferes.
// Role: persister l'etat "transfere" sans changer le schema SQL, tout en gardant une UI propre.
const FORWARDED_MESSAGE_MARKER = '__SU_FORWARDED__::';

export const markForwardedMessageContent = (content: string | null | undefined): string => {
  const safeContent = content ?? '';

  if (safeContent.startsWith(FORWARDED_MESSAGE_MARKER)) {
    return safeContent;
  }

  return `${FORWARDED_MESSAGE_MARKER}${safeContent}`;
};

export const isForwardedMessageContent = (content: string | null | undefined): boolean => {
  return (content ?? '').startsWith(FORWARDED_MESSAGE_MARKER);
};

export const stripForwardedMessageMarker = (content: string | null | undefined): string => {
  const safeContent = content ?? '';

  if (!safeContent.startsWith(FORWARDED_MESSAGE_MARKER)) {
    return safeContent;
  }

  return safeContent.slice(FORWARDED_MESSAGE_MARKER.length);
};

export const getForwardedMessagePreview = (
  content: string | null | undefined,
  fallback = 'Message transfere'
): string => {
  const normalizedContent = stripForwardedMessageMarker(content);
  return normalizedContent.trim() ? normalizedContent : fallback;
};