/**
 * Utilitaire pour les "messages système" des groupes de discussion.
 *
 * Format du contenu en base : `__GROUP_EVENT__:TYPE:arg1:arg2:...`
 * Exemple : `__GROUP_EVENT__:MEMBER_ADDED:Solo TOGO:Un admin`
 *
 * Ces messages sont insérés (souvent par un trigger côté Supabase) lors d'actions
 * d'administration du groupe : ajout/retrait de membre, renommage, etc.
 * Ce module fournit :
 *   - `parseDiscussionEvent`  : détecter et décoder un tel contenu
 *   - `formatDiscussionEvent` : produire un libellé lisible en français
 *   - `getDiscussionEventPreview` : version courte pour la liste des discussions
 */

export const GROUP_EVENT_PREFIX = '__GROUP_EVENT__:';

export type DiscussionEventType =
  | 'MEMBER_ADDED'
  | 'MEMBER_REMOVED'
  | 'MEMBER_JOINED'
  | 'MEMBER_LEFT'
  | 'MEMBER_PROMOTED'
  | 'MEMBER_DEMOTED'
  | 'GROUP_CREATED'
  | 'GROUP_RENAMED'
  | 'GROUP_DESCRIPTION_CHANGED'
  | 'GROUP_AVATAR_CHANGED';

export interface DiscussionEvent {
  type: DiscussionEventType | string;
  args: string[];
}

export const isDiscussionEventContent = (content: unknown): content is string => {
  return typeof content === 'string' && content.startsWith(GROUP_EVENT_PREFIX);
};

export const parseDiscussionEvent = (content: unknown): DiscussionEvent | null => {
  if (!isDiscussionEventContent(content)) return null;
  const raw = content.slice(GROUP_EVENT_PREFIX.length);
  // On découpe sur ":" mais on tolère qu'un argument contienne lui-même des ":"
  // en regroupant les morceaux restants pour les arguments les plus loin.
  const parts = raw.split(':');
  if (parts.length === 0) return null;
  const [type, ...args] = parts;
  return { type, args };
};

const sanitize = (value: string | undefined, fallback: string): string => {
  const v = (value || '').trim();
  return v.length > 0 ? v : fallback;
};

/**
 * Produit un libellé lisible (français) pour un message système.
 * Renvoie `null` si le contenu n'est pas un événement reconnu.
 */
export const formatDiscussionEvent = (content: unknown): string | null => {
  const event = parseDiscussionEvent(content);
  if (!event) return null;

  const { type, args } = event;

  switch (type) {
    case 'MEMBER_ADDED': {
      const target = sanitize(args[0], 'Un membre');
      const actor = sanitize(args[1], 'Un admin');
      return `${actor} a ajouté ${target} au groupe`;
    }
    case 'MEMBER_REMOVED': {
      const target = sanitize(args[0], 'Un membre');
      const actor = sanitize(args[1], 'Un admin');
      return `${actor} a retiré ${target} du groupe`;
    }
    case 'MEMBER_JOINED': {
      const actor = sanitize(args[0], 'Un membre');
      return `${actor} a rejoint le groupe`;
    }
    case 'MEMBER_LEFT': {
      const actor = sanitize(args[0], 'Un membre');
      return `${actor} a quitté le groupe`;
    }
    case 'MEMBER_PROMOTED': {
      const target = sanitize(args[0], 'Un membre');
      const actor = sanitize(args[1], 'Un admin');
      return `${actor} a promu ${target} au rang d'administrateur`;
    }
    case 'MEMBER_DEMOTED': {
      const target = sanitize(args[0], 'Un membre');
      const actor = sanitize(args[1], 'Un admin');
      return `${actor} a retiré le rôle d'administrateur à ${target}`;
    }
    case 'GROUP_CREATED': {
      const actor = sanitize(args[0], 'Un membre');
      return `${actor} a créé le groupe`;
    }
    case 'GROUP_RENAMED': {
      const newName = sanitize(args[0], 'un nouveau nom');
      const actor = sanitize(args[1], 'Un admin');
      return `${actor} a renommé le groupe en « ${newName} »`;
    }
    case 'GROUP_DESCRIPTION_CHANGED': {
      const actor = sanitize(args[0], 'Un admin');
      return `${actor} a modifié la description du groupe`;
    }
    case 'GROUP_AVATAR_CHANGED': {
      const actor = sanitize(args[0], 'Un admin');
      return `${actor} a changé la photo du groupe`;
    }
    default:
      // Format inconnu : on affiche un fallback générique plutôt que le brut.
      return 'Mise à jour du groupe';
  }
};

/**
 * Variante courte adaptée à un aperçu (liste des discussions).
 * Identique à `formatDiscussionEvent` mais tronquée si trop longue.
 */
export const getDiscussionEventPreview = (content: unknown): string | null => {
  const label = formatDiscussionEvent(content);
  if (!label) return null;
  return label.length > 60 ? `${label.slice(0, 57)}…` : label;
};
