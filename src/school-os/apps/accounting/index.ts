/**
 * Export des composants et hooks de l'application de comptabilité
 */

export { AccountingApp } from './AccountingApp';
export { AccountingView } from './components/AccountingView';
export { Dashboard } from './components/Dashboard';
export { TransactionsList } from './components/TransactionsList';
export { AddTransactionDialog } from './components/AddTransactionDialog';
export {
  useTransactions,
  useAccountingStats,
  useAddTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
  type Transaction,
  type AccountingStats,
} from './hooks/useAccounting';
