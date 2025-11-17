/**
 * Export des composants et hooks de l'application de paiements
 */

export { PaymentsApp } from './PaymentsApp';
export { AddPaymentDialog } from './components/AddPaymentDialog';
export { FamilyPaymentDialog } from './components/FamilyPaymentDialog';
export { StudentPaymentCard } from './components/StudentPaymentCard';
export { FamilyPaymentCard } from './components/FamilyPaymentCard';
export { useSchoolStudents, useStudentPayments, useAddPayment } from './hooks/usePayments';
export { 
  useFamiliesWithPayments, 
  useAddFamilyPayment, 
  calculateDiscountedAmount,
  type FamilyWithStudents 
} from './hooks/useFamilyPayments';
