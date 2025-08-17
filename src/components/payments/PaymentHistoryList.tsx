import React from 'react';
import { useStudentPaymentHistory } from '@/hooks/useStudentPaymentProgress';

// Composant: affiche l'historique des paiements d'un élève pour une formation donnée
interface PaymentHistoryListProps {
  formationId: string;
  className?: string;
}

type PaymentRecord = {
  id?: string;
  days_added?: number | null;
  payment_date?: string | null;
  status?: string | null;
  created_at?: string | null;
  is_request?: boolean | null;
};

const formatDate = (iso?: string | null) => {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString('fr-FR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  } catch {
    return iso;
  }
};

const statusLabel = (status?: string | null) => {
  switch ((status || '').toLowerCase()) {
    case 'processed':
      return 'Traitée';
    case 'pending':
      return 'En attente';
    case 'rejected':
      return 'Rejetée';
    default:
      return status || '—';
  }
};

const PaymentHistoryList: React.FC<PaymentHistoryListProps> = ({ formationId, className = '' }) => {
  const { data, isLoading, error } = useStudentPaymentHistory(formationId);

  if (isLoading) {
    return (
      <div className="space-y-2 text-sm text-muted-foreground">
        <div className="h-4 w-2/3 bg-muted rounded animate-pulse" />
        <div className="h-4 w-1/2 bg-muted rounded animate-pulse" />
        <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-destructive">Erreur lors du chargement de l'historique.</p>
    );
  }

  if (!data || data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Aucun paiement trouvé.</p>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <ul className="divide-y divide-border">
        {data.map((item: PaymentRecord, idx: number) => (
          <li key={item.id || idx} className="py-2 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">
                {item.is_request ? 'Demande de paiement' : 'Paiement crédité'}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDate(item.payment_date || item.created_at)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold">
                {item.days_added ? `+${item.days_added} jour${item.days_added > 1 ? 's' : ''}` : '—'}
              </p>
              <p className="text-xs text-muted-foreground">{statusLabel(item.status)}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PaymentHistoryList;
