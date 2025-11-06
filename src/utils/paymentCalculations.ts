/**
 * Calcule les jours restants en temps réel à partir des données de paiement
 */
export const calculateRemainingDays = (
  totalDaysRemaining: number | null | undefined,
  lastPaymentDate: string | null | undefined
): number => {
  if (!totalDaysRemaining || totalDaysRemaining <= 0) {
    return 0;
  }

  if (!lastPaymentDate) {
    return totalDaysRemaining;
  }

  const lastPayment = new Date(lastPaymentDate);
  const currentDate = new Date();
  const daysSincePayment = Math.floor(
    (currentDate.getTime() - lastPayment.getTime()) / (1000 * 60 * 60 * 24)
  );

  return Math.max(0, totalDaysRemaining - daysSincePayment);
};
