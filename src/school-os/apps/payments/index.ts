/**
 * Export des composants et hooks de l'application de paiements
 */

export { PaymentsApp } from './PaymentsApp';
export { AddPaymentDialog } from './components/AddPaymentDialog';
export { FamilyPaymentDialog } from './components/FamilyPaymentDialog';
export { StudentPaymentCard } from './components/StudentPaymentCard';
export { FamilyPaymentCard } from './components/FamilyPaymentCard';
export { DiscountBadge } from './components/DiscountBadge';
export { MonthlyStatusBadges } from './components/MonthlyStatusBadges';
export { useSchoolStudents, useStudentPayments, useAddPayment, useUpdatePayment, useDeletePayment } from './hooks/usePayments';
export { 
  useFamiliesWithPayments, 
  useAddFamilyPayment, 
  calculateDiscountedAmount,
  formatDiscount,
  hasDiscount,
  type FamilyWithStudents 
} from './hooks/useFamilyPayments';
export { 
  calculateDiscountedAmount as calculateDiscount,
  formatDiscount as formatDiscountDisplay,
  hasDiscount as checkHasDiscount
} from './utils/discountCalculations';
