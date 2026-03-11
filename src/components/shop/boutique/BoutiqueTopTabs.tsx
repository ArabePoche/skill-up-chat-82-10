/**
 * Onglets style TikTok pour la page boutique
 * Marketplace | Gestion boutique | Dashboard
 */
import React from 'react';
import { Store, ShoppingBag } from 'lucide-react';

export type BoutiqueView = 'marketplace' | 'gestion';

interface BoutiqueTopTabsProps {
    activeView: BoutiqueView;
    onViewChange: (view: BoutiqueView) => void;
}

const BoutiqueTopTabs: React.FC<BoutiqueTopTabsProps> = ({ 
    activeView, 
    onViewChange,
}) => {
    return (
        <div className="w-full bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 shadow-xl border-b border-white/10">
            <div className="flex items-center justify-center gap-0 max-w-lg mx-auto">
                {/* Marketplace Tab */}
                <button
                    onClick={() => onViewChange('marketplace')}
                    className={`flex-1 flex items-center justify-center gap-2 py-4 px-4 text-sm font-bold transition-all duration-300 relative ${activeView === 'marketplace'
                            ? 'text-white'
                            : 'text-white/60 hover:text-white/90'
                        }`}
                >
                    <ShoppingBag size={20} />
                    <span>Marketplace</span>
                    {activeView === 'marketplace' && (
                        <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-orange-400 to-orange-500 shadow-[0_-2px_10px_rgba(249,115,22,0.5)] animate-in fade-in duration-300" />
                    )}
                </button>

                {/* Séparateur */}
                <div className="w-px h-6 bg-white/20" />

                {/* Gestion boutique Tab */}
                <button
                    onClick={() => onViewChange('gestion')}
                    className={`flex-1 flex items-center justify-center gap-2 py-4 px-4 text-sm font-bold transition-all duration-300 relative ${activeView === 'gestion'
                            ? 'text-white'
                            : 'text-white/60 hover:text-white/90'
                        }`}
                >
                    <Store size={20} />
                    <span>Gestion</span>
                    {activeView === 'gestion' && (
                        <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-400 to-emerald-500 shadow-[0_-2px_10px_rgba(16,185,129,0.5)] animate-in fade-in duration-300" />
                    )}
                </button>
            </div>
        </div>
    );
};

export default BoutiqueTopTabs;
