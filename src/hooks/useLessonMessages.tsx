import { useCachedLessonMessages } from '@/message-cache';

/**
 * Hook unifié pour récupérer les messages d'une leçon
 * Gère à la fois les messages de promotion et individuels
 * @deprecated Use useCachedLessonMessages from @/message-cache for better performance
 * 
 * Ce hook utilise maintenant automatiquement le cache local pour optimiser les performances
 */
export const useLessonMessages = useCachedLessonMessages;
