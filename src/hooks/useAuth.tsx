import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { authStore } from '@/offline/utils/authStore';
import { syncManager } from '@/offline/utils/syncManager';

const isDevelopment = import.meta.env.DEV;

interface Profile {
  id: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  avatar_url?: string;
  is_teacher?: boolean;
  role?: string;
  email?: string;
  is_shop_owner?: boolean;
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
  const [cachedProfile, setCachedProfile] = useState<Profile | null>(null);

  // Fonction pour charger la session depuis le cache
  const loadCachedSession = useCallback(async () => {
    try {
      const cached = await authStore.getCachedSession();
      if (cached) {
        console.log('🔐 Using cached session (offline mode)');
        setUser(cached.user);
        setSession(cached.session);
        setIsOfflineMode(true);

        // Charger aussi le profil caché
        const profile = await authStore.getCachedProfile(cached.user.id);
        if (profile) {
          console.log('📦 Using cached profile (offline mode)');
          setCachedProfile(profile as Profile);
        }

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
          .select('id, first_name, last_name, username, avatar_url, is_teacher, role, is_verified, email, is_shop_owner')
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

  // Utiliser le profil caché si le profil de la query n'est pas disponible
  const effectiveProfile = profile || cachedProfile;

  useEffect(() => {
    let mounted = true;

    // IMPORTANT: Enregistrer le listener AVANT toute opération async
    // pour ne pas rater l'événement PASSWORD_RECOVERY
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (isDevelopment) {
        console.log('Auth state changed:', event);
      }

      // Rediriger vers /reset-password si l'événement est PASSWORD_RECOVERY
      if (event === 'PASSWORD_RECOVERY' && session) {
        setSession(session);
        setUser(session.user);
        setLoading(false);
        // Naviguer vers la page de réinitialisation du mot de passe
        const currentPath = window.location.pathname;
        if (currentPath !== '/reset-password') {
          window.location.href = '/reset-password';
        }
        return;
      }

      if (session) {
        setSession(session);
        setUser(session.user);
        setIsOfflineMode(false);
        setSupabaseError(null);
        // Sauvegarder dans le cache (déféré pour éviter deadlock)
        setTimeout(() => {
          cacheSession(session.user, session);
        }, 0);
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setIsOfflineMode(false);
        setCachedProfile(null);
        // Nettoyer le cache (déféré)
        setTimeout(() => {
          authStore.clearAll();
        }, 0);
      }

      setLoading(false);
    });

    // Ensuite, initialiser la session de manière async
    const initAuth = async () => {
      try {
        // Charger la session depuis le cache
        const hasCachedSession = await loadCachedSession();

        // Vérifier si on est vraiment en ligne
        const isReallyOnline = syncManager.getOnlineStatus();

        if (!isReallyOnline && hasCachedSession) {
          console.log('📵 Offline mode with cached session - skipping Supabase');
          if (mounted) {
            setLoading(false);
          }
          return;
        }

        // Vérification de la session existante avec fallback offline
        try {
          const { data: { session: existingSession }, error } = await supabase.auth.getSession();

          if (error) {
            console.warn('⚠️ Supabase auth error, trying cache:', error.message);

            const errorMessage = error.message || '';
            if (errorMessage.includes('402') ||
              errorMessage.includes('restricted') ||
              errorMessage.includes('quota')) {
              setSupabaseError('Service Supabase suspendu - Mode offline');
            } else {
              setSupabaseError(error.message);
            }

            if (!hasCachedSession) {
              await loadCachedSession();
            }
            if (mounted) {
              setLoading(false);
            }
            return;
          }

          if (existingSession && mounted) {
            setSession(existingSession);
            setUser(existingSession.user);
            setIsOfflineMode(false);
            await cacheSession(existingSession.user, existingSession);
          } else if (mounted && !hasCachedSession) {
            setUser(null);
            setSession(null);
          }

          if (mounted) {
            setLoading(false);
          }
        } catch (err: any) {
          console.warn('⚠️ Network error, trying cache:', err);
          setSupabaseError('Erreur de connexion');

          if (!hasCachedSession) {
            await loadCachedSession();
          }

          if (mounted) {
            setLoading(false);
          }
        }
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
      subscription.unsubscribe();
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
      setCachedProfile(null);

      // Rafraîchir la page après déconnexion
      window.location.reload();
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);

      // Force le nettoyage même en cas d'erreur
      setUser(null);
      setSession(null);
      setCachedProfile(null);
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
      profile: effectiveProfile || null,
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
