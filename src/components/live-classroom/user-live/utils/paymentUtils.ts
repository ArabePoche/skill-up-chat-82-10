export const fcfaToScRounded = (fcfa: number, rate: number): number => {
  if (rate <= 0) return 0;
  return Math.ceil(fcfa / rate);
};

export const formatScAmount = (amount: number): string => {
  return amount.toLocaleString('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};
