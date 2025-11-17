/**
 * Utilitaires pour calculer les montants avec remise
 * Synchronisé avec la fonction DB calculate_amount_with_discount
 */

/**
 * Calcule le montant final avec remise appliquée
 * @param baseAmount - Montant de base (frais annuel)
 * @param discountPercentage - Remise en pourcentage (0-100)
 * @param discountAmount - Remise en montant fixe
 * @returns Objet contenant le montant final et la remise appliquée
 */
export const calculateDiscountedAmount = (
  baseAmount: number,
  discountPercentage: number | null | undefined,
  discountAmount: number | null | undefined
): { finalAmount: number; discountApplied: number } => {
  let finalAmount = baseAmount;
  let discountApplied = 0;

  // Appliquer la remise en pourcentage d'abord
  if (discountPercentage && discountPercentage > 0) {
    discountApplied = (baseAmount * discountPercentage) / 100;
    finalAmount -= discountApplied;
  }

  // Puis appliquer la remise fixe
  if (discountAmount && discountAmount > 0) {
    discountApplied += discountAmount;
    finalAmount -= discountAmount;
  }

  // S'assurer que le montant final n'est pas négatif
  finalAmount = Math.max(0, finalAmount);

  return { finalAmount, discountApplied };
};

/**
 * Formate l'affichage de la remise
 */
export const formatDiscount = (
  discountPercentage: number | null | undefined,
  discountAmount: number | null | undefined
): string | null => {
  if (discountPercentage && discountPercentage > 0) {
    return `${discountPercentage}%`;
  }
  if (discountAmount && discountAmount > 0) {
    return `${discountAmount.toLocaleString('fr-FR')} FCFA`;
  }
  return null;
};

/**
 * Vérifie si un élève a une remise
 */
export const hasDiscount = (
  discountPercentage: number | null | undefined,
  discountAmount: number | null | undefined
): boolean => {
  return !!(
    (discountPercentage && discountPercentage > 0) ||
    (discountAmount && discountAmount > 0)
  );
};
