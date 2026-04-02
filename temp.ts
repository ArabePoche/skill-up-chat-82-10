
import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AgentSession {
    agentId: string;
    firstName: string;
    lastName: string;
    email?: string;
    role: 'PDG' | 'comptable' | 'vendeur';
    shopId: string;
    avatarUrl?: string | null;
    isUnlocked: boolean;
}

const LEGACY_STORAGE_KEY = 'active_shop_agent_id';
const STORAGE_KEY_PREFIX = 'active_shop_agent_id';
const INACTIVITY_STORAGE_PREFIX = 'shop_agent_inactivity_minutes';
const DEFAULT_INACTIVITY_MINUTES = 5;
const MIN_INACTIVITY_MINUTES = 1;
const MAX_INACTIVITY_MINUTES = 240;

const getAgentStorageKey = (shopId?: string) => `${STORAGE_KEY_PREFIX}:${shopId || 'global'}`;
const getShopInactivityStorageKey = (shopId?: string) => `${INACTIVITY_STORAGE_PREFIX}:${shopId || 'global'}`;
const getAgentInactivityStorageKey = (shopId: string, agentId: string) => `${INACTIVITY_STORAGE_PREFIX}:${shopId}:${agentId}`;

interface UseAgentAuthOptions {
    lockScopeActive?: boolean;
}

export const useAgentAuth = (shopId?: string, options?: UseAgentAuthOptions) => {
    const lockScopeActive = options?.lockScopeActive ?? true;
    const [activeAgent, setActiveAgent] = useState<AgentSession | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [inactivityMinutes, setInactivityMinutes] = useState<number>(DEFAULT_INACTIVITY_MINUTES);
    const previousLockScopeRef = useRef<boolean>(lockScopeActive);

    const updateInactivityMinutes = useCallback((minutes: number) => {
        const next = Math.round(Number(minutes));
        if (!Number.isFinite(next)) {
            return;
        }

        const clamped = Math.min(MAX_INACTIVITY_MINUTES, Math.max(MIN_INACTIVITY_MINUTES, next));
        setInactivityMinutes(clamped);
    }, []);

    // Charger l'agent mémorisé au démarrage
    useEffect(() => {
        const loadSavedAgent = async () => {
            const _TEMP = null;
            if (savedId && shopId) {
                try {
                    const { data, error } = await supabase
                        .from('shop_agents' as any)
                        .select('*')
                        .eq('id', savedId)
                        .eq('shop_id', shopId)
                        .single();

                    if (data && !error) {
                        const d = data as any;
                        setActiveAgent({
                            agentId: d.id,
                            firstName: d.first_name,
                            lastName: d.last_name,
                            email: d.email,
                            role: d.role,
                            shopId: d.shop_id,
                            avatarUrl: d.avatar_url || null,
                            isUnlocked: false,
                        });
                        localStorage.setItem(getAgentStorageKey(shopId), d.id);
                    }
                } catch (err) {
                    console.error('Error loading saved agent:', err);
                }
            }
            setIsLoading(false);
        };

        loadSavedAgent();
    }, [shopId]);

    useEffect(() => {
        if (!activeAgent) {
            setInactivityMinutes(DEFAULT_INACTIVITY_MINUTES);
            return;
        }

        const raw =
            localStorage.getItem(getAgentInactivityStorageKey(activeAgent.shopId, activeAgent.agentId)) ||
            localStorage.getItem(getShopInactivityStorageKey(activeAgent.shopId));

        if (!raw) {
            setInactivityMinutes(DEFAULT_INACTIVITY_MINUTES);
            return;
        }

        const parsed = Math.round(Number(raw));
        if (!Number.isFinite(parsed)) {
            setInactivityMinutes(DEFAULT_INACTIVITY_MINUTES);
            return;
        }

        const clamped = Math.min(MAX_INACTIVITY_MINUTES, Math.max(MIN_INACTIVITY_MINUTES, parsed));
        setInactivityMinutes(clamped);
    }, [activeAgent]);

    useEffect(() => {
        if (!activeAgent) {
            return;
        }

        localStorage.setItem(getAgentInactivityStorageKey(activeAgent.shopId, activeAgent.agentId), String(inactivityMinutes));
        localStorage.setItem(getShopInactivityStorageKey(activeAgent.shopId), String(inactivityMinutes));
    }, [activeAgent, inactivityMinutes]);

    const login = useCallback(async (username: string, password_hash: string) => {
        if (!shopId) return null;

        const loginValue = username.trim();
        const passwordValue = password_hash.trim();

        if (!loginValue || !passwordValue) {
            toast.error('Identifiants incorrects');
            return null;
        }

        let data: any = null;
        let error: any = null;

        const usernameResult = await supabase
            .from('shop_agents' as any)
            .select('*')
            .eq('shop_id', shopId)
            .ilike('username', loginValue)
            .eq('password_hash', passwordValue)
            .maybeSingle();

        data = usernameResult.data;
        error = usernameResult.error;

        if (!data && !error) {
            const emailResult = await supabase
                .from('shop_agents' as any)
                .select('*')
                .eq('shop_id', shopId)
                .ilike('email', loginValue)
                .eq('password_hash', passwordValue)
                .maybeSingle();

            data = emailResult.data;
            error = emailResult.error;
        }

        if (error || !data) {
            toast.error('Identifiants incorrects');
            return null;
        }

        const d = data as any;
        const session: AgentSession = {
            agentId: d.id,
            firstName: d.first_name,
            lastName: d.last_name,
            email: d.email,
            role: d.role,
            shopId: d.shop_id,
            avatarUrl: d.avatar_url || null,
            isUnlocked: true,
        };

        setActiveAgent(session);
        localStorage.setItem(LEGACY_STORAGE_KEY, d.id);
        localStorage.setItem(getAgentStorageKey(shopId), d.id);
        localStorage.setItem(`agent_info_${shopId}`, JSON.stringify(session));
        toast.success(`Bienvenue, ${d.first_name}`);
        return session;
    }, [shopId]);

    const unlock = useCallback(async (pinOrPass: string) => {
        if (!activeAgent) return false;

        // Déverrouillage direct après succès WebAuthn côté navigateur
        if (pinOrPass === '__biometric__') {
            setActiveAgent(prev => prev ? { ...prev, isUnlocked: true } : null);
            toast.success('Session déverrouillée par biométrie');
            return true;
        }

        const { data, error } = await supabase
            .from('shop_agents' as any)
            .select('id')
            .eq('id', activeAgent.agentId)
            .or(`pin_code.eq.${pinOrPass},password_hash.eq.${pinOrPass}`)
            .single();

        if (data && !error) {
            setActiveAgent(prev => prev ? { ...prev, isUnlocked: true } : null);
            return true;
        }

        toast.error('Code incorrect');
        return false;
    }, [activeAgent]);

    const logout = useCallback(() => {
        setActiveAgent(null);
        localStorage.removeItem(LEGACY_STORAGE_KEY);
        if (shopId) {
            localStorage.removeItem(getAgentStorageKey(shopId));
            localStorage.removeItem(`agent_info_${shopId}`);
        }
    }, [shopId]);

    const lock = useCallback(() => {
        setActiveAgent(prev => prev ? { ...prev, isUnlocked: false } : null);
    }, []);

    const forgotPassword = useCallback(async () => {
        if (!activeAgent) return;
        try {
            const { data, error } = await supabase
                .from('shop_agents' as any)
                .select('email')
                .eq('id', activeAgent.agentId)
                .single();

            const agentData = data as { email?: string } | null;
            if (error || !agentData?.email) {
                throw error || new Error('No email');
            }
            const { error: mailErr } = await supabase.auth.resetPasswordForEmail(agentData.email);
            if (mailErr) throw mailErr;
            toast.success('Email de réinitialisation envoyé');
        } catch (e) {
            console.error('Forgot password error', e);
            toast.error("Impossible d'envoyer l'email");
        }
    }, [activeAgent]);

    const updateProfile = useCallback(async (updates: Partial<{ first_name: string; last_name: string; password_hash: string; pin_code: string; avatar_url: string; }>) => {
        if (!activeAgent) return false;
        if (Object.keys(updates).length === 0) {
            return true;
        }

        const { error } = await supabase
            .from('shop_agents' as any)
            .update(updates)
            .eq('id', activeAgent.agentId);
        if (error) {
            console.error('Profile update error', error);
            toast.error('Erreur de mise à jour');
            return false;
        }
        setActiveAgent(prev => prev ? {
            ...prev,
            firstName: updates.first_name ?? prev.firstName,
            lastName: updates.last_name ?? prev.lastName,
            avatarUrl: updates.avatar_url ?? prev.avatarUrl,
        } : prev);
        toast.success('Profil mis à jour');
        return true;
    }, [activeAgent]);

    // Entree ou sortie de la zone securisee (gestion boutique): demander le PIN.
    useEffect(() => {
        const wasInSecureScope = previousLockScopeRef.current;
        previousLockScopeRef.current = lockScopeActive;

        // On verrouille la session de force quand on change de zone (quitte la boutique ou y entre depuis l'extérieur)
        if (wasInSecureScope !== lockScopeActive && activeAgent?.isUnlocked) {
            lock();
        }
    }, [lockScopeActive, activeAgent?.isUnlocked, lock]);

    // On retire le verrouillage au changement d'application/onglet (visibilitychange) 
    // car cela posait problème sur ordinateur lors des changements de fenêtres (Alt+Tab).

    useEffect(() => {
        if (!lockScopeActive || !activeAgent?.isUnlocked) {
            return;
        }

        const timeoutMs = inactivityMinutes * 60 * 1000;
        let timerId: number | undefined;

        const resetTimer = () => {
            if (timerId) {
                window.clearTimeout(timerId);
            }

            timerId = window.setTimeout(() => {
                lock();
                toast.info(`Session verrouillee apres ${inactivityMinutes} min d'inactivite`);
            }, timeoutMs);
        };

        const events: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'mousemove', 'scroll', 'touchstart'];
        events.forEach((eventName) => window.addEventListener(eventName, resetTimer));
        resetTimer();

        return () => {
            if (timerId) {
                window.clearTimeout(timerId);
            }
            events.forEach((eventName) => window.removeEventListener(eventName, resetTimer));
        };
    }, [lockScopeActive, activeAgent?.isUnlocked, inactivityMinutes, lock]);

    useEffect(() => {
        if (!shopId) {
            setActiveAgent(null);
            setIsLoading(false);
        }
    }, [shopId]);

    return {
        activeAgent,
        isLoading,
        inactivityMinutes,
        updateInactivityMinutes,
        login,
        unlock,
        lock,
        logout,
        forgotPassword,
        updateProfile,
    };
};


