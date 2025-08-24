
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface TypingUser {
  user_id: string;
  user_name: string;
  is_teacher: boolean;
}

export const useTypingListener = (lessonId: string, formationId: string) => {
  const { user } = useAuth();
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const channelRef = useRef<any>(null);
  const isSubscribedRef = useRef(false);

  useEffect(() => {
    if (!lessonId || !formationId || !user) {
      
      return;
    }

    const channelName = `typing-${lessonId}-${formationId}`;
    

    // Nettoyer l'ancien channel s'il existe
    if (channelRef.current) {
      
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      isSubscribedRef.current = false;
    }

    // Créer un nouveau channel
    channelRef.current = supabase
      .channel(channelName)
      .on('broadcast', { event: 'typing_start' }, (payload) => {
        const typingUser = payload.payload as TypingUser & { lesson_id: string; formation_id: string };
        
        
        
        // Ne pas afficher notre propre indicateur de frappe
        if (typingUser.user_id === user.id) {
          
          return;
        }
        
        // Vérifier que c'est pour la bonne leçon et formation
        if (typingUser.lesson_id !== lessonId || typingUser.formation_id !== formationId) {
          
          return;
        }

        
        
        setTypingUsers(prev => {
          // Supprimer l'utilisateur s'il était déjà dans la liste
          const filtered = prev.filter(u => u.user_id !== typingUser.user_id);
          // Ajouter l'utilisateur
          const newList = [...filtered, {
            user_id: typingUser.user_id,
            user_name: typingUser.user_name,
            is_teacher: typingUser.is_teacher
          }];
          
          return newList;
        });
      })
      .on('broadcast', { event: 'typing_stop' }, (payload) => {
        const { user_id, lesson_id, formation_id } = payload.payload as { 
          user_id: string; 
          lesson_id: string; 
          formation_id: string 
        };
        
        
        
        // Vérifier que c'est pour la bonne leçon et formation
        if (lesson_id !== lessonId || formation_id !== formationId) {
          
          return;
        }
        
      
        
        setTypingUsers(prev => {
          const filtered = prev.filter(u => u.user_id !== user_id);
          
          return filtered;
        });
      })
      .subscribe((status) => {
        
        isSubscribedRef.current = status === 'SUBSCRIBED';
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Typing listener ready for lesson:', lessonId);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Typing listener error for lesson:', lessonId);
        }
      });

    return () => {
      
      setTypingUsers([]);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      channelRef.current = null;
      isSubscribedRef.current = false;
    };
  }, [lessonId, formationId, user?.id]);

  return typingUsers;
};
