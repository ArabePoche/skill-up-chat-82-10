// Utilitaire: encode et decode les rapports d'appel stockes dans conversation_messages.
export const CALL_LOG_PREFIX = '[call-log]';

export type CallLogType = 'audio' | 'video';

export type CallLogOutcome = 'completed' | 'missed' | 'rejected' | 'cancelled';

export interface StructuredCallLog {
  version: 2;
  outcome: CallLogOutcome;
  callType: CallLogType;
  initiatedByUserId: string;
  durationSeconds?: number;
}

export interface LegacyCallLog {
  version: 1;
  rawLabel: string;
}

export type ParsedCallLog = StructuredCallLog | LegacyCallLog;

export interface CallLogPresentation {
  title: string;
  subtitle?: string;
  icon: 'incoming' | 'outgoing' | 'missed';
  isMissed: boolean;
}

export const createCallLogContent = (payload: string | StructuredCallLog) => {
  const encodedPayload = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return `${CALL_LOG_PREFIX} ${encodedPayload}`;
};

export const parseCallLogContent = (content?: string | null): ParsedCallLog | null => {
  if (!content?.startsWith(CALL_LOG_PREFIX)) {
    return null;
  }

  const rawValue = content.slice(CALL_LOG_PREFIX.length).trim();

  try {
    const parsedValue = JSON.parse(rawValue) as Partial<StructuredCallLog>;
    if (
      parsedValue.version === 2
      && (parsedValue.outcome === 'completed'
        || parsedValue.outcome === 'missed'
        || parsedValue.outcome === 'rejected'
        || parsedValue.outcome === 'cancelled')
      && (parsedValue.callType === 'audio' || parsedValue.callType === 'video')
      && typeof parsedValue.initiatedByUserId === 'string'
    ) {
      return {
        version: 2,
        outcome: parsedValue.outcome,
        callType: parsedValue.callType,
        initiatedByUserId: parsedValue.initiatedByUserId,
        durationSeconds: typeof parsedValue.durationSeconds === 'number' ? parsedValue.durationSeconds : undefined,
      };
    }
  } catch {
    // Compatibilite avec les anciens logs texte.
  }

  return {
    version: 1,
    rawLabel: rawValue,
  };
};

export const formatCallDuration = (durationSeconds?: number) => {
  if (!durationSeconds || durationSeconds <= 0) {
    return undefined;
  }

  const totalSeconds = Math.max(0, Math.round(durationSeconds));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    if (minutes > 0) {
      return `${hours} h ${minutes.toString().padStart(2, '0')} min`;
    }

    return `${hours} h`;
  }

  if (minutes > 0) {
    return `${minutes} min`;
  }

  return `${seconds} s`;
};

export const getCallLogPresentation = (callLog: ParsedCallLog, currentUserId?: string | null): CallLogPresentation => {
  if (callLog.version === 1) {
    const normalized = callLog.rawLabel.toLowerCase();
    return {
      title: callLog.rawLabel,
      icon: normalized.includes('manqué') || normalized.includes('sans réponse') ? 'missed' : 'outgoing',
      isMissed: normalized.includes('manqué') || normalized.includes('sans réponse'),
    };
  }

  const isOutgoing = callLog.initiatedByUserId === currentUserId;
  const typeLabel = callLog.callType === 'video' ? 'vidéo' : 'audio';

  if (callLog.outcome === 'completed') {
    return {
      title: `Appel ${typeLabel} ${isOutgoing ? 'sortant' : 'entrant'}`,
      subtitle: formatCallDuration(callLog.durationSeconds),
      icon: isOutgoing ? 'outgoing' : 'incoming',
      isMissed: false,
    };
  }

  if (callLog.outcome === 'missed') {
    return {
      title: isOutgoing ? `Appel ${typeLabel} sans réponse` : `Appel ${typeLabel} manqué`,
      icon: 'missed',
      isMissed: true,
    };
  }

  if (callLog.outcome === 'rejected') {
    return {
      title: isOutgoing ? `Appel ${typeLabel} refusé` : `Appel ${typeLabel} rejeté`,
      icon: 'missed',
      isMissed: false,
    };
  }

  return {
    title: `Appel ${typeLabel} annulé`,
    icon: isOutgoing ? 'outgoing' : 'incoming',
    isMissed: false,
  };
};