
import { format, isToday, isYesterday, isThisWeek, isThisYear, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';

export const groupMessagesByDate = (messages: any[]) => {
  const groups: { [key: string]: any[] } = {};

  messages.forEach(message => {
    // Vérifier si la date est valide
    const date = new Date(message.created_at);
    
    if (!isValid(date)) {
      console.warn('Invalid date found:', message.created_at);
      // Utiliser un groupe par défaut pour les dates invalides
      const defaultGroup = 'Messages récents';
      if (!groups[defaultGroup]) {
        groups[defaultGroup] = [];
      }
      groups[defaultGroup].push(message);
      return;
    }

    let groupKey = '';

    if (isToday(date)) {
      groupKey = 'Aujourd\'hui';
    } else if (isYesterday(date)) {
      groupKey = 'Hier';
    } else if (isThisWeek(date)) {
      groupKey = format(date, 'EEEE', { locale: fr });
    } else if (isThisYear(date)) {
      groupKey = format(date, 'd MMMM', { locale: fr });
    } else {
      groupKey = format(date, 'd MMMM yyyy', { locale: fr });
    }

    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(message);
  });

  return groups;
};

export const formatMessageTime = (date: string | Date) => {
  const dateObj = new Date(date);
  
  if (!isValid(dateObj)) {
    return '--:--';
  }
  
  return format(dateObj, 'HH:mm', { locale: fr });
};
