import { useEffect, useRef } from 'react';

/**
 * Hook pour intercepter globalement la lecture de codes à barres depuis une scanneuse physique (type douchette).
 * Les scanneuses simulent des frappes de clavier très rapides suivies d'une touche 'Enter'.
 */
export const useBarcodeScanner = (onScan: (barcode: string) => void, enabled: boolean = true) => {
    const buffer = useRef('');
    const lastKeyTime = useRef(Date.now());

    useEffect(() => {
        if (!enabled) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignorer les frappes si l'utilisateur est dans un champ de texte comme un textarea (sauf s'il s'agit du champ de recherche)
            const target = e.target as HTMLElement;
            const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
            
            const currentTime = Date.now();
            
            // Si plus de 50ms se sont écoulées depuis la dernière touche, on réinitialise le buffer
            // (La frappe humaine est généralement > 50ms, les douchettes sont < 20ms)
            if (currentTime - lastKeyTime.current > 50) {
                buffer.current = '';
            }
            
            lastKeyTime.current = currentTime;

            if (e.key === 'Enter') {
                if (buffer.current.length > 3) { // Un code barre a une longueur minimum
                    onScan(buffer.current);
                    
                    // Si on était dans un input de recherche, on peut vouloir l'effacer ou l'empêcher de s'activer par défaut
                    if (isInput && (target as HTMLInputElement).type === 'text') {
                        // On optionnellement effacer la valeur ou prévenir l'action par défaut
                        // (La gestion spécifique à un input se faira préférentiellement sur le onChange de cet input)
                    }
                    buffer.current = '';
                }
            } else if (e.key.length === 1) { // Touche de caractère standard
                buffer.current += e.key;
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [onScan, enabled]);
};
