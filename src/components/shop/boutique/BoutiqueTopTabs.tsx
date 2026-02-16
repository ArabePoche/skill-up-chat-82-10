/**
 * Onglets style TikTok pour la page boutique
 * Marketplace | Gestion boutique
 */
import React from 'react';
import { Store, ShoppingBag } from 'lucide-react';

interface BoutiqueTopTabsProps {
    activeView: 'marketplace' | 'gestion';
    onViewChange: (view: 'marketplace' | 'gestion') => void;
}

const BoutiqueTopTabs: React.FC<BoutiqueTopTabsProps> = ({ activeView, onViewChange }) => {
    return (
        <div className="sticky top-0 z-50 bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 shadow-xl">
            <div className="flex items-center justify-center gap-0">
                {/* Marketplace Tab */}
                <button
                    onClick={() => onViewChange('marketplace')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-4 text-sm font-bold transition-all duration-300 relative ${activeView === 'marketplace'
                            ? 'text-white'
                            : 'text-white/50 hover:text-white/80'
                        }`}
                >
                    <ShoppingBag size={18} />
                    <span>Marketplace</span>
                    {/* Indicateur actif animé */}
                    {activeView === 'marketplace' && (
                        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-[3px] bg-gradient-to-r from-orange-400 to-orange-500 rounded-full shadow-lg shadow-orange-500/30 animate-[scaleIn_0.2s_ease-out]" />
                    )}
                </button>

                {/* Séparateur */}
                <div className="w-px h-6 bg-white/20" />

                {/* Gestion boutique Tab */}
                <button
                    onClick={() => onViewChange('gestion')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-4 text-sm font-bold transition-all duration-300 relative ${activeView === 'gestion'
                            ? 'text-white'
                            : 'text-white/50 hover:text-white/80'
                        }`}
                >
                    <Store size={18} />
                    <span>Gestion boutique</span>
                    {activeView === 'gestion' && (
                        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-[3px] bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full shadow-lg shadow-emerald-500/30 animate-[scaleIn_0.2s_ease-out]" />
                    )}
                </button>
            </div>
        </div>
    );
};

export default BoutiqueTopTabs;
