import { useEffect, useRef, useState, useCallback } from 'react';

interface UseInfiniteScrollOptions {
  threshold?: number;
  rootMargin?: string;
  enabled?: boolean;
}

export const useInfiniteScroll = ({
  threshold = 0.1,
  rootMargin = '200px',
  enabled = true,
}: UseInfiniteScrollOptions = {}) => {
  const [isInView, setIsInView] = useState(false);
  const targetRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    const [entry] = entries;
    setIsInView(entry.isIntersecting);
  }, []);

  useEffect(() => {
    if (!enabled || !targetRef.current) return;

    // Nettoyer l'observer précédent
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // Créer un nouvel observer
    observerRef.current = new IntersectionObserver(handleIntersection, {
      threshold,
      rootMargin,
    });

    // Observer l'élément cible
    observerRef.current.observe(targetRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [enabled, threshold, rootMargin, handleIntersection]);

  return { targetRef, isInView };
};
