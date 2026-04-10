export const extractPresenceEntries = (value: unknown): Record<string, any>[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(item => extractPresenceEntries(item));
  if (typeof value !== 'object') return [];
  
  const record = value as Record<string, any>;
  if (Array.isArray(record.metas)) return record.metas.flatMap(item => extractPresenceEntries(item));
  
  if ('user_id' in record || 'userId' in record || 'role' in record) return [record];
  return Object.values(record).flatMap(item => extractPresenceEntries(item));
};

export const resolvePresenceUserId = (presence: Record<string, any> | null | undefined, fallbackKey?: string): string | null => {
  if (!presence) return fallbackKey || null;

  const userId = presence.user_id || presence.userId || fallbackKey;
  return typeof userId === 'string' && userId.length > 0 ? userId : null;
};

export const mergePresenceEntries = (
  currentEntries: Record<string, any>[],
  incomingEntries: unknown,
  fallbackKey?: string,
): Record<string, any>[] => {
  const merged = new Map<string, Record<string, any>>();

  currentEntries.forEach((presence) => {
    const userId = resolvePresenceUserId(presence);
    if (!userId) return;
    merged.set(userId, presence);
  });

  extractPresenceEntries(incomingEntries).forEach((presence) => {
    const userId = resolvePresenceUserId(presence, fallbackKey);
    if (!userId) return;

    const existing = merged.get(userId);
    const isMoreRecent = presence.online_at && (!existing?.online_at || presence.online_at > existing.online_at);
    const hasBetterRole = (presence.role === 'participant' || presence.role === 'host') && existing?.role === 'viewer';

    if (!existing || isMoreRecent || hasBetterRole) {
      merged.set(userId, {
        ...existing,
        ...presence,
        user_id: userId,
        presence_ref: fallbackKey ?? existing?.presence_ref,
      });
    }
  });

  return Array.from(merged.values());
};

export const extractPresenceUserIds = (entries: unknown, fallbackKey?: string): string[] => {
  const ids = new Set<string>();

  if (fallbackKey) {
    ids.add(fallbackKey);
  }

  extractPresenceEntries(entries).forEach((presence) => {
    const userId = resolvePresenceUserId(presence, fallbackKey);
    if (userId) {
      ids.add(userId);
    }
  });

  return Array.from(ids);
};

export const removePresenceEntries = (
  currentEntries: Record<string, any>[],
  leavingEntries: unknown,
  fallbackKey?: string,
): Record<string, any>[] => {
  const leavingIds = new Set(extractPresenceUserIds(leavingEntries, fallbackKey));

  return currentEntries.filter((presence) => {
    const userId = resolvePresenceUserId(presence);
    return Boolean(userId && !leavingIds.has(userId));
  });
};

export const syncPresenceEntries = (presenceState: Record<string, unknown>): Record<string, any>[] => {
  return Object.entries(presenceState).reduce<Record<string, any>[]>((currentEntries, [presenceKey, presences]) => {
    return mergePresenceEntries(currentEntries, presences, presenceKey);
  }, []);
};
