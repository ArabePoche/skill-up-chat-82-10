import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { authStore } from '@/offline/utils/authStore';

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
  isOfflineMode: boolean;
  supabaseError: string | null;
  signOut: () => Promise<void>;
  logout: () => Promise<void>;
  retryConnection: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [supabaseError, setSupabaseError] = useState<string | null>(null);

  // Fonction pour charger la session depuis le cache
  const loadCachedSession = useCallback(async () => {
    try {
      const cached = await authStore.getCachedSession();
      if (cached) {
        console.log('🔐 Using cached session (offline mode)');
        setUser(cached.user);
        setSession(cached.session);
        setIsOfflineMode(true);
        return true;
      }
    } catch (error) {
      console.error('Error loading cached session:', error);
    }
    return false;
  }, []);

  // Fonction pour sauvegarder la session dans le cache
  const cacheSession = useCallback(async (user: User, session: Session) => {
    try {
      await authStore.saveSession(user, session);
    } catch (error) {
      console.error('Error caching session:', error);
    }
  }, []);

  // Fonction pour réessayer la connexion
  const retryConnection = useCallback(async () => {
    setLoading(true);
    setSupabaseError(null);
    
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        throw error;
      }
      
      if (session) {
        setSession(session);
        setUser(session.user);
        setIsOfflineMode(false);
        await cacheSession(session.user, session);
      }
    } catch (error: any) {
      console.error('Retry connection failed:', error);
      setSupabaseError(error.message || 'Connexion échouée');
    } finally {
      setLoading(false);
    }
  }, [cacheSession]);

  // Récupérer le profil utilisateur avec fallback offline
  const { data: profile, refetch: refetchProfile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        console.log('❌ No user ID');
        return null;
      }
      
      console.log('🔍 Fetching profile for user:', user.id);
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, username, avatar_url, is_teacher, role, is_verified, email')
          .eq('id', user.id)
          .single();
        
        if (error) {
          // Vérifie si c'est une erreur 402 ou de connexion
          const errorMessage = error.message || '';
          if (errorMessage.includes('402') || 
              errorMessage.includes('restricted') || 
              errorMessage.includes('quota')) {
            console.warn('⚠️ Supabase restricted, using cached profile');
            setIsOfflineMode(true);
            setSupabaseError('Service Supabase suspendu');
            
            // Essayer de récupérer le profil depuis le cache
            const cachedProfile = await authStore.getCachedProfile(user.id);
            if (cachedProfile) {
              return cachedProfile as Profile;
            }
          }
          
          console.error('❌ Error fetching profile:', error);
          return null;
        }
        
        // Sauvegarder le profil dans le cache
        if (data) {
          await authStore.saveProfile(data);
          setIsOfflineMode(false);
          setSupabaseError(null);
        }
        
        console.log('✅ Profile loaded in useAuth:', data);
        return data as Profile;
      } catch (err: any) {
        console.error('❌ Network error fetching profile:', err);
        setIsOfflineMode(true);
        
        // Fallback sur le cache
        const cachedProfile = await authStore.getCachedProfile(user.id);
        if (cachedProfile) {
          console.log('📦 Using cached profile');
          return cachedProfile as Profile;
        }
        
        return null;
      }
    },
    enabled: !!user?.id,
    staleTime: 30000,
    gcTime: 300000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    retry: 1, // Limite les retries pour ne pas bloquer en mode offline
  });

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        // Configuration du listener d'état d'authentification
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (!mounted) return;
          
          console.log('Auth state changed:', event, session?.user?.email);
          
          if (session) {
            setSession(session);
            setUser(session.user);
            setIsOfflineMode(false);
            setSupabaseError(null);
            // Sauvegarder dans le cache
            await cacheSession(session.user, session);
          } else if (event === 'SIGNED_OUT') {
            setSession(null);
            setUser(null);
            setIsOfflineMode(false);
            // Nettoyer le cache
            await authStore.clearAll();
          }
          
          setLoading(false);
        });

        // Vérification de la session existante avec fallback offline
        try {
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error) {
            // Erreur Supabase (ex: 402) - essayer le cache
            console.warn('⚠️ Supabase auth error, trying cache:', error.message);
            
            const errorMessage = error.message || '';
            if (errorMessage.includes('402') || 
                errorMessage.includes('restricted') || 
                errorMessage.includes('quota')) {
              setSupabaseError('Service Supabase suspendu - Mode offline');
            } else {
              setSupabaseError(error.message);
            }
            
            const hasCached = await loadCachedSession();
            if (!hasCached && mounted) {
              setLoading(false);
            }
            return () => subscription.unsubscribe();
          }
          
          if (session && mounted) {
            setSession(session);
            setUser(session.user);
            setIsOfflineMode(false);
            await cacheSession(session.user, session);
          } else if (mounted) {
            // Pas de session Supabase - essayer le cache
            const hasCached = await loadCachedSession();
            if (!hasCached) {
              // Vraiment pas de session
              setUser(null);
              setSession(null);
            }
          }
          
          if (mounted) {
            setLoading(false);
          }
        } catch (err: any) {
          // Erreur réseau - essayer le cache
          console.warn('⚠️ Network error, trying cache:', err);
          setSupabaseError('Erreur de connexion');
          
          const hasCached = await loadCachedSession();
          if (!hasCached && mounted) {
            setLoading(false);
          } else if (mounted) {
            setLoading(false);
          }
        }

        return () => subscription.unsubscribe();
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    return () => {
      mounted = false;
    };
  }, [cacheSession, loadCachedSession]);

  const signOut = async () => {
    try {
      setLoading(true);
      
      // Nettoyer le cache offline
      await authStore.clearAll();
      
      // Nettoyer le stockage local de manière plus complète
      const keysToRemove: string[] = [];
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
      try {
        const signOutPromise = supabase.auth.signOut({ scope: 'global' });
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Sign out timeout')), 5000)
        );
        
        await Promise.race([signOutPromise, timeoutPromise]);
      } catch (err) {
        console.warn('Sign out from Supabase failed (might be offline):', err);
      }
      
      // Reset des états locaux
      setUser(null);
      setSession(null);
      setIsOfflineMode(false);
      setSupabaseError(null);
      
      // Rafraîchir la page après déconnexion
      window.location.reload();
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      
      // Force le nettoyage même en cas d'erreur
      setUser(null);
      setSession(null);
      await authStore.clearAll();
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
    <AuthContext.Provider value={{ 
      user, 
      session, 
      profile: profile || null, 
      loading, 
      isOfflineMode,
      supabaseError,
      signOut, 
      logout,
      retryConnection
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * Hook pour vérifier le rôle de l'utilisateur authentifié
 * Avec fallback offline
 */
export const useUserRole = () => {
  const { user, isOfflineMode, profile } = useAuth();
  
  return useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: async () => {
      if (!user) {
        return { role: null, isAdmin: false };
      }

      // En mode offline, utiliser le profil déjà chargé
      if (isOfflineMode && profile) {
        return {
          role: profile.role,
          isAdmin: profile.role === 'admin'
        };
      }

      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        
        if (!authUser) {
          // Fallback sur le profil caché
          if (profile) {
            return {
              role: profile.role,
              isAdmin: profile.role === 'admin'
            };
          }
          return { role: null, isAdmin: false };
        }

        const { data: fetchedProfile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', authUser.id)
          .single();

        if (error) {
          console.error('Error fetching user role:', error);
          // Fallback sur le profil caché
          if (profile) {
            return {
              role: profile.role,
              isAdmin: profile.role === 'admin'
            };
          }
          return { role: null, isAdmin: false };
        }

        return {
          role: fetchedProfile?.role,
          isAdmin: fetchedProfile?.role === 'admin'
        };
      } catch (err) {
        console.error('Network error fetching role:', err);
        // Fallback sur le profil caché
        if (profile) {
          return {
            role: profile.role,
            isAdmin: profile.role === 'admin'
          };
        }
        return { role: null, isAdmin: false };
      }
    },
    enabled: !!user,
    retry: 1,
  });
};
