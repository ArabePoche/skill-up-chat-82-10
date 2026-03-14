
import React, { useEffect, useState } from 'react';
import {
    Lock,
    User,
    Fingerprint,
    ChevronRight,
    RefreshCcw,
    Keyboard
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useShopAgentAvatarUpload, useShopAgents } from '@/hooks/shop/useShopAgents';
import { AgentSession } from '@/hooks/shop/useAgentAuth';
import { Capacitor } from '@capacitor/core';
import { BiometricAuth } from '@aparajita/capacitor-biometric-auth';

interface AgentLockScreenProps {
    shopId: string;
    activeAgent: AgentSession | null;
    inactivityMinutes: number;
    onInactivityMinutesChange: (minutes: number) => void;
    triggerMode?: 'floating' | 'inline';
    triggerClassName?: string;
    onLogin: (username: string, pass: string) => Promise<any>;
    onUnlock: (pin: string) => Promise<boolean>;
    forgotPassword: () => Promise<void>;
    updateProfile: (updates: Partial<{ first_name:string; last_name:string; password_hash:string; pin_code:string; avatar_url:string; }>) => Promise<boolean>;
}

export const AgentLockScreen: React.FC<AgentLockScreenProps> = ({
    shopId,
    activeAgent,
    inactivityMinutes,
    onInactivityMinutesChange,
    triggerMode = 'floating',
    triggerClassName,
    onLogin,
    onUnlock,
    forgotPassword,
    updateProfile
}) => {
    const [mode, setMode] = useState<'login' | 'unlock'>(activeAgent ? 'unlock' : 'login');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [pin, setPin] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [forgotMode, setForgotMode] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [profileForm, setProfileForm] = useState({
        first_name: activeAgent?.firstName || '',
        last_name: activeAgent?.lastName || '',
        password: '',
        pin_code: '',
        avatarFile: null as File | null,
    });
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [inactivityInput, setInactivityInput] = useState<string>(String(inactivityMinutes));

    const { data: agents } = useShopAgents(shopId);
    const uploadAvatar = useShopAgentAvatarUpload(shopId);

    const isBiometricCancelError = (error: unknown) => {
        const message = error instanceof Error ? error.message : String(error || '');
        return /cancel|cancelled|canceled|user.?cancel|aborted|notallowederror/i.test(message);
    };

    useEffect(() => {
        setMode(activeAgent ? 'unlock' : 'login');
    }, [activeAgent]);

    useEffect(() => {
        setInactivityInput(String(inactivityMinutes));
    }, [inactivityMinutes]);

    useEffect(() => {
        setProfileForm(prev => ({
            ...prev,
            first_name: activeAgent?.firstName || '',
            last_name: activeAgent?.lastName || '',
            password: '',
            pin_code: '',
            avatarFile: null,
        }));
        setAvatarPreview(activeAgent?.avatarUrl || null);
    }, [activeAgent]);

    useEffect(() => {
        if (mode === 'login') {
            setUsername('');
            setPassword('');
            setPin('');
            return;
        }

        setPassword('');
    }, [mode]);

    const handleFullLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessing(true);

        try {
            const result = await onLogin(username, password);
            if (result) {
                setMode('unlock');
            }
        } catch (error) {
            console.error('Agent login error:', error);
            toast.error("Impossible de se connecter pour le moment");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleForgot = async () => {
        setIsProcessing(true);
        await forgotPassword();
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

    const handleBiometricUnlock = async () => {
        // Priorité au mode natif Capacitor (mobile)
        if (Capacitor.isNativePlatform()) {
            try {
                const info = await (BiometricAuth as any).checkBiometry();
                if (!info.isAvailable) {
                    toast.error("Biométrie non disponible ou non configurée sur cet appareil");
                    return;
                }

                await (BiometricAuth as any).authenticate({
                    reason: 'Déverrouiller la caisse de la boutique',
                });
                await onUnlock('__biometric__');
            } catch (error) {
                if (isBiometricCancelError(error)) {
                    return;
                }

                console.error('Biometric authenticate error', error);
                toast.error("Authentification biométrique échouée");
            }
            return;
        }

        // Fallback Web: WebAuthn dans un navigateur / PWA
        if (typeof window === 'undefined' || !(window as any).PublicKeyCredential) {
            toast.error("La biométrie n'est pas supportée sur ce navigateur");
            return;
        }

        try {
            toast.info("Veuillez utiliser votre empreinte ou Face ID");

            const challenge = new Uint8Array(32);
            window.crypto.getRandomValues(challenge);

            await (navigator as any).credentials.get({
                publicKey: {
                    challenge,
                    timeout: 60000,
                    userVerification: 'required',
                    rpId: window.location.hostname,
                },
            });

            await onUnlock('__biometric__');
        } catch (error) {
            if (isBiometricCancelError(error)) {
                return;
            }

            console.error('WebAuthn biometric error', error);
            toast.error("Authentification biométrique annulée ou échouée");
        }
    };

    const parseInactivityValue = () => {
        const parsed = Math.round(Number(inactivityInput));
        if (!Number.isFinite(parsed) || parsed < 1 || parsed > 240) {
            toast.error('Le délai de verrouillage doit être compris entre 1 et 240 minutes');
            return null;
        }

        return parsed;
    };

    const openSettingsPanel = () => {
        setProfileForm(prev => ({
            ...prev,
            first_name: activeAgent?.firstName || '',
            last_name: activeAgent?.lastName || '',
            password: '',
            pin_code: '',
            avatarFile: null,
        }));
        setAvatarPreview(activeAgent?.avatarUrl || null);
        setInactivityInput(String(inactivityMinutes));
        setEditMode(true);
    };

    const isUnlocked = !!activeAgent?.isUnlocked;

    if (isUnlocked && !editMode) {
        const defaultTriggerClassName = triggerMode === 'inline'
            ? 'h-8 w-8 rounded-md overflow-hidden border border-white/30 bg-white/20 hover:bg-white/30 transition'
            : 'fixed top-3 right-3 z-[111] w-11 h-11 rounded-full overflow-hidden border border-white/30 shadow-lg bg-slate-900/80 backdrop-blur';

        return (
            <button
                type="button"
                onClick={openSettingsPanel}
                className={triggerClassName || defaultTriggerClassName}
                aria-label="Ouvrir les parametres du compte"
                title="Parametres du compte"
            >
                {activeAgent?.avatarUrl ? (
                    <img src={activeAgent.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                    <span className="w-full h-full flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                    </span>
                )}
            </button>
        );
    }

    return (
        <div className="fixed inset-0 z-[110] bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <Card className="w-full max-w-md border-white/10 bg-white/5 text-white shadow-2xl animate-in zoom-in duration-300">
                <CardHeader className="text-center pb-2">
                    <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20 overflow-hidden">
                        {mode === 'unlock' && activeAgent?.avatarUrl ? (
                            <img src={activeAgent.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                        ) : (
                            <Lock className="text-white w-8 h-8" />
                        )}
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
                        <form onSubmit={handleFullLogin} autoComplete="off" className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="agent-user" className="text-slate-300">Identifiant / Email</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                                    <Input
                                        id="agent-user"
                                        name="agent-user-login"
                                        value={username}
                                        onChange={e => setUsername(e.target.value)}
                                        placeholder="Ex: jean.dupont"
                                        className="bg-white/10 border-white/20 pl-10 text-white placeholder:text-slate-600"
                                        autoComplete="off"
                                        spellCheck={false}
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
                                        name="agent-pass-login"
                                        type="password"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="bg-white/10 border-white/20 pl-10 text-white placeholder:text-slate-600"
                                        autoComplete="new-password"
                                        required
                                    />
                                </div>
                            </div>

                            {forgotMode && (
                                <p className="text-sm text-yellow-300 mb-2">
                                    Un lien de réinitialisation sera envoyé à votre adresse email.
                                </p>
                            )}

                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    className="text-xs text-blue-300 hover:underline"
                                    onClick={() => toast.info('Contactez le propriétaire pour réinitialiser le mot de passe')}
                                >
                                    Mot de passe oublié ?
                                </button>
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-blue-600 hover:bg-blue-700 h-11 font-bold shadow-lg shadow-blue-600/20"
                                disabled={isProcessing}
                            >
                                {isProcessing ? <RefreshCcw className="animate-spin w-5 h-5" /> : "S'identifier"}
                            </Button>
                        </form>
                    ) : editMode ? (
                        <form
                            onSubmit={async (e) => {
                                e.preventDefault();
                                const parsedMinutes = parseInactivityValue();
                                if (parsedMinutes === null) {
                                    return;
                                }

                                setIsProcessing(true);

                                try {
                                    const updates: Partial<{ first_name: string; last_name: string; password_hash: string; pin_code: string; avatar_url: string; }> = {};

                                    if (profileForm.first_name.trim()) updates.first_name = profileForm.first_name.trim();
                                    if (profileForm.last_name.trim()) updates.last_name = profileForm.last_name.trim();
                                    if (profileForm.password.trim()) updates.password_hash = profileForm.password.trim();
                                    if (profileForm.pin_code.trim()) updates.pin_code = profileForm.pin_code.trim();

                                    if (profileForm.avatarFile && activeAgent?.agentId) {
                                        const avatarUrl = await uploadAvatar.mutateAsync({
                                            agentId: activeAgent.agentId,
                                            file: profileForm.avatarFile,
                                        });
                                        updates.avatar_url = avatarUrl;
                                    }

                                    if (Object.keys(updates).length > 0) {
                                        const didUpdate = await updateProfile(updates);
                                        if (!didUpdate) {
                                            return;
                                        }
                                    }

                                    onInactivityMinutesChange(parsedMinutes);
                                    setEditMode(false);
                                } catch (err) {
                                    console.error(err);
                                    toast.error('Erreur lors de la mise à jour');
                                } finally {
                                    setIsProcessing(false);
                                }
                            }}
                            className="space-y-4"
                        >
                            <div className="space-y-2">
                                <Label htmlFor="first-name" className="text-slate-300">Prénom</Label>
                                <Input
                                    id="first-name"
                                    value={profileForm.first_name}
                                    onChange={e => setProfileForm(prev => ({ ...prev, first_name: e.target.value }))}
                                    className="bg-white/10 border-white/20 text-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="last-name" className="text-slate-300">Nom</Label>
                                <Input
                                    id="last-name"
                                    value={profileForm.last_name}
                                    onChange={e => setProfileForm(prev => ({ ...prev, last_name: e.target.value }))}
                                    className="bg-white/10 border-white/20 text-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="new-pass" className="text-slate-300">Nouveau mot de passe</Label>
                                <Input
                                    id="new-pass"
                                    type="password"
                                    value={profileForm.password}
                                    onChange={e => setProfileForm(prev => ({ ...prev, password: e.target.value }))}
                                    className="bg-white/10 border-white/20 text-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="new-pin" className="text-slate-300">Nouveau PIN</Label>
                                <Input
                                    id="new-pin"
                                    value={profileForm.pin_code}
                                    onChange={e => setProfileForm(prev => ({ ...prev, pin_code: e.target.value }))}
                                    className="bg-white/10 border-white/20 text-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lock-delay" className="text-slate-300">Délai de verrouillage (minutes)</Label>
                                <Input
                                    id="lock-delay"
                                    type="number"
                                    min={1}
                                    max={240}
                                    value={inactivityInput}
                                    onChange={e => setInactivityInput(e.target.value)}
                                    className="bg-white/10 border-white/20 text-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-300">Avatar</Label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={e => {
                                        const file = e.target.files?.[0] || null;
                                        if (file && !file.type.startsWith('image/')) {
                                            toast.error('Veuillez sélectionner une image valide');
                                            return;
                                        }
                                        if (file && file.size > 5 * 1024 * 1024) {
                                            toast.error("L'image ne doit pas dépasser 5 Mo");
                                            return;
                                        }
                                        setProfileForm(prev => ({ ...prev, avatarFile: file }));
                                        if (file) {
                                            const reader = new FileReader();
                                            reader.onload = () => {
                                                setAvatarPreview(reader.result as string);
                                            };
                                            reader.readAsDataURL(file);
                                        }
                                    }}
                                />
                                {avatarPreview && <img src={avatarPreview} className="w-16 h-16 rounded-full" />}
                            </div>
                            <div className="flex justify-between">
                                <Button type="button" variant="ghost" onClick={() => setEditMode(false)} disabled={isProcessing}>Annuler</Button>
                                <Button type="submit" disabled={isProcessing}>Valider</Button>
                            </div>
                        </form>
                    ) : (
                        <>
                            <div className="space-y-8">
                            {/* Affichage des points du PIN */}
                            <div className="flex justify-center gap-4">
                                {[...Array(6)].map((_, i) => (
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
                                    onClick={handleBiometricUnlock}
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
                            </div>
                        </div>
                    </>
                    )}

                </CardContent>
            </Card>
        </div>
    );
};
