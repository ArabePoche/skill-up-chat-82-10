
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AgentSession {
    agentId: string;
    firstName: string;
    lastName: string;
    role: 'PDG' | 'comptable' | 'vendeur';
    shopId: string;
    isUnlocked: boolean;
}

const STORAGE_KEY = 'active_shop_agent_id';

export const useAgentAuth = (shopId?: string) => {
    const [activeAgent, setActiveAgent] = useState<AgentSession | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Charger l'agent mémorisé au démarrage
    useEffect(() => {
        const loadSavedAgent = async () => {
            const savedId = localStorage.getItem(STORAGE_KEY);
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
                            role: d.role,
                            shopId: d.shop_id,
                            isUnlocked: false,
                        });
                    }
                } catch (err) {
                    console.error('Error loading saved agent:', err);
                }
            }
            setIsLoading(false);
        };

        loadSavedAgent();
    }, [shopId]);

    const login = useCallback(async (username: string, password_hash: string) => {
        if (!shopId) return;

        console.log('Attempting login for shop:', shopId, 'username:', username);

        const { data, error } = await supabase
            .from('shop_agents' as any)
            .select('*')
            .eq('shop_id', shopId)
            .eq('username', username)
            .eq('password_hash', password_hash)
            .single();

        if (error || !data) {
            console.error('Login error or no data:', error);
            toast.error('Identifiants incorrects');
            return null;
        }

        const session: AgentSession = {
            agentId: data.id,
            firstName: data.first_name,
            lastName: data.last_name,
            role: data.role,
            shopId: data.shop_id,
            isUnlocked: true,
        };

        setActiveAgent(session);
        localStorage.setItem(STORAGE_KEY, data.id);
        toast.success(`Bienvenue, ${data.first_name}`);
        return session;
    }, [shopId]);

    const unlock = useCallback(async (pinOrPass: string) => {
        if (!activeAgent) return false;

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
        localStorage.removeItem(STORAGE_KEY);
    }, []);

    const lock = useCallback(() => {
        setActiveAgent(prev => prev ? { ...prev, isUnlocked: false } : null);
    }, []);

    return {
        activeAgent,
        isLoading,
        login,
        unlock,
        lock,
        logout,
    };
};
