
import React, { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface Profile {
  id: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  avatar_url?: string;
  is_teacher?: boolean;
  role?: 'user' | 'admin';
  is_verified?: boolean;
  email?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Récupérer le profil utilisateur
  const { data: profile, refetch: refetchProfile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['user-profile', user?.id], // Changé la clé pour éviter les conflits de cache
    queryFn: async () => {
      if (!user?.id) {
        console.log('❌ No user ID');
        return null;
      }
      
      console.log('🔍 Fetching profile for user:', user.id);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, username, avatar_url, is_teacher, role, is_verified, email')
        .eq('id', user.id)
        .single();
      
      if (error) {
        console.error('❌ Error fetching profile:', error);
        return null;
      }
      
      console.log('✅ Profile loaded in useAuth:', data);
      return data;
    },
    enabled: !!user?.id,
    staleTime: 30000, // Cache pendant 30 secondes
    gcTime: 300000, // Garde en cache pendant 5 minutes
    refetchOnMount: true, // Recharge à chaque montage
    refetchOnWindowFocus: false, // Ne recharge pas au focus
  });

  useEffect(() => {
    // Configuration du listener d'état d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Vérification de la session existante
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      setLoading(true);
      
      // Nettoyer le stockage local de manière plus complète
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('supabase.auth.') || key.includes('sb-') || key.startsWith('sb:'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // Nettoyer le sessionStorage aussi
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (key.startsWith('supabase.auth.') || key.includes('sb-') || key.startsWith('sb:'))) {
          sessionStorage.removeItem(key);
        }
      }

      // Déconnexion globale avec timeout
      const signOutPromise = supabase.auth.signOut({ scope: 'global' });
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Sign out timeout')), 5000)
      );
      
      await Promise.race([signOutPromise, timeoutPromise]);
      
      // Reset des états locaux
      setUser(null);
      setSession(null);
      
      // Rafraîchir la page après déconnexion
      window.location.reload();
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      
      // Force le nettoyage même en cas d'erreur
      setUser(null);
      setSession(null);
      localStorage.clear();
      sessionStorage.clear();
      
      // Rafraîchir la page même en cas d'erreur
      window.location.reload();
    } finally {
      setLoading(false);
    }
  };

  const logout = signOut; // Alias pour compatibilité

  return (
    <AuthContext.Provider value={{ user, session, profile: profile || null, loading, signOut, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * Hook pour vérifier le rôle de l'utilisateur authentifié
 */
export const useUserRole = () => {
  return useQuery({
    queryKey: ['user-role'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { role: null, isAdmin: false };
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching user role:', error);
        return { role: null, isAdmin: false };
      }

      return {
        role: profile?.role,
        isAdmin: profile?.role === 'admin'
      };
    },
  });
};
