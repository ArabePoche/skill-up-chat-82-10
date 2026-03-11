
import React, { useState } from 'react';
import {
    Lock,
    User,
    Fingerprint,
    ChevronRight,
    RefreshCcw,
    LogOut,
    Keyboard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useShopAgents } from '@/hooks/shop/useShopAgents';
import { AgentSession } from '@/hooks/shop/useAgentAuth';

interface AgentLockScreenProps {
    shopId: string;
    activeAgent: AgentSession | null;
    onLogin: (username: string, pass: string) => Promise<any>;
    onUnlock: (pin: string) => Promise<boolean>;
    onLogout: () => void;
}

export const AgentLockScreen: React.FC<AgentLockScreenProps> = ({
    shopId,
    activeAgent,
    onLogin,
    onUnlock,
    onLogout
}) => {
    const [mode, setMode] = useState<'login' | 'unlock'>(activeAgent ? 'unlock' : 'login');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [pin, setPin] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const { data: agents } = useShopAgents(shopId);

    const handleFullLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessing(true);
        const result = await onLogin(username, password);
        if (result) {
            setMode('unlock');
        }
        setIsProcessing(false);
    };

    const handleQuickUnlock = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessing(true);
        const success = await onUnlock(pin);
        if (success) {
            setPin('');
        }
        setIsProcessing(false);
    };

    const handleKeyPress = (num: string) => {
        if (pin.length < 6) {
            setPin(prev => prev + num);
        }
    };

    const handleDelete = () => {
        setPin(prev => prev.slice(0, -1));
    };

    // Si on est déjà déverrouillé, on ne montre rien (le parent gère l'affichage)
    if (activeAgent?.isUnlocked) return null;

    return (
        <div className="fixed inset-0 z-[110] bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <Card className="w-full max-w-md border-white/10 bg-white/5 text-white shadow-2xl animate-in zoom-in duration-300">
                <CardHeader className="text-center pb-2">
                    <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
                        <Lock className="text-white w-8 h-8" />
                    </div>
                    <CardTitle className="text-2xl font-bold">Accès Sécurisé</CardTitle>
                    <CardDescription className="text-slate-400">
                        {mode === 'login'
                            ? "Veuillez vous identifier pour accéder à la boutique"
                            : `Session de ${activeAgent?.firstName}`}
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6 pt-4">
                    {mode === 'login' ? (
                        <form onSubmit={handleFullLogin} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="agent-user" className="text-slate-300">Identifiant / Email</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                                    <Input
                                        id="agent-user"
                                        value={username}
                                        onChange={e => setUsername(e.target.value)}
                                        placeholder="Ex: jean.dupont"
                                        className="bg-white/10 border-white/20 pl-10 text-white placeholder:text-slate-600"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="agent-pass" className="text-slate-300">Mot de passe</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                                    <Input
                                        id="agent-pass"
                                        type="password"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="bg-white/10 border-white/20 pl-10 text-white placeholder:text-slate-600"
                                        required
                                    />
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-blue-600 hover:bg-blue-700 h-11 font-bold shadow-lg shadow-blue-600/20"
                                disabled={isProcessing}
                            >
                                {isProcessing ? <RefreshCcw className="animate-spin w-5 h-5" /> : "S'identifier"}
                            </Button>
                        </form>
                    ) : (
                        <div className="space-y-8">
                            {/* Affichage des points du PIN */}
                            <div className="flex justify-center gap-4">
                                {[...Array(activeAgent?.role === 'vendeur' ? 4 : 6)].map((_, i) => (
                                    <div
                                        key={i}
                                        className={`w-4 h-4 rounded-full transition-all duration-200 ${pin.length > i ? 'bg-blue-500 scale-125 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-white/10 border border-white/20'
                                            }`}
                                    />
                                ))}
                            </div>

                            {/* Clavier numérique */}
                            <div className="grid grid-cols-3 gap-3 max-w-[280px] mx-auto">
                                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                                    <Button
                                        key={num}
                                        variant="ghost"
                                        onClick={() => handleKeyPress(num)}
                                        className="h-16 text-2xl font-bold bg-white/5 hover:bg-white/10 rounded-2xl active:scale-95 transition-transform"
                                    >
                                        {num}
                                    </Button>
                                ))}
                                <Button
                                    variant="ghost"
                                    onClick={() => {
                                        // Simulation biométrie
                                        toast.info("Identification biométrique...");
                                        setTimeout(() => onUnlock('1234'), 1000);
                                    }}
                                    className="h-16 text-blue-400 bg-white/5 hover:bg-white/10 rounded-2xl"
                                >
                                    <Fingerprint size={24} />
                                </Button>
                                <Button
                                    variant="ghost"
                                    onClick={() => handleKeyPress('0')}
                                    className="h-16 text-2xl font-bold bg-white/5 hover:bg-white/10 rounded-2xl active:scale-95 transition-transform"
                                >
                                    0
                                </Button>
                                <Button
                                    variant="ghost"
                                    onClick={handleDelete}
                                    className="h-16 text-slate-400 bg-white/5 hover:bg-white/10 rounded-2xl"
                                >
                                    <ChevronRight className="rotate-180" />
                                </Button>
                            </div>

                            <div className="flex flex-col gap-2">
                                <Button
                                    onClick={handleQuickUnlock}
                                    className="w-full bg-blue-600 hover:bg-blue-700 h-11 font-bold"
                                    disabled={isProcessing || pin.length < 4}
                                >
                                    Déverrouiller
                                </Button>

                                <div className="flex justify-between px-2 pt-2">
                                    <button
                                        onClick={() => setMode('login')}
                                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                    >
                                        <Keyboard size={12} /> Changer d'agent
                                    </button>
                                    <button
                                        onClick={onLogout}
                                        className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                                    >
                                        <LogOut size={12} /> Déconnexion
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
