// Hook global pour déclencher des animations de gain Habbah depuis n'importe quel composant
import { useState, useCallback } from 'react';
import { HabbahGain } from '@/components/HabbahGainAnimation';

let globalNotify: ((amount: number, label: string) => void) | null = null;

/** Appeler depuis n'importe où pour afficher l'animation de gain */
export const notifyHabbahGain = (amount: number, label: string) => {
  globalNotify?.(amount, label);
};

export const useHabbahGainNotifier = () => {
  const [gains, setGains] = useState<HabbahGain[]>([]);

  const addGain = useCallback((amount: number, label: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setGains(prev => [...prev, { id, amount, label }]);
  }, []);

  const removeGain = useCallback((id: string) => {
    setGains(prev => prev.filter(g => g.id !== id));
  }, []);

  // Enregistrer le notifier global
  globalNotify = addGain;

  return { gains, removeGain };
};
