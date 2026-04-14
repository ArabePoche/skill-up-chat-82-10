/**
 * Répartit un paiement familial de scolarité par boucles mensuelles successives.
 * La logique suit l'ordre d'affichage des élèves sélectionnés et respecte le reste dû de chacun.
 */

export interface FamilyPaymentDistributionStudent {
  id: string;
  total_amount_due: number;
  remaining_amount: number;
}

const DEFAULT_SCHOOL_MONTHS = 9;
const EPSILON = 0.01;

const roundCurrency = (amount: number): number => Math.round(amount * 100) / 100;

const getMonthlyFee = (student: FamilyPaymentDistributionStudent): number => {
  if (student.total_amount_due <= EPSILON) {
    return 0;
  }

  return roundCurrency(student.total_amount_due / DEFAULT_SCHOOL_MONTHS);
};

export const distributeFamilyPaymentByMonthlyLoop = (
  students: FamilyPaymentDistributionStudent[],
  totalAmount: number
): Record<string, string> => {
  const amounts = Object.fromEntries(students.map((student) => [student.id, '0.00']));

  if (students.length === 0 || totalAmount <= EPSILON) {
    return amounts;
  }

  const allocations = new Map<string, number>(students.map((student) => [student.id, 0]));
  let remainingPool = roundCurrency(totalAmount);
  let lastAllocatedIndex = -1;

  while (remainingPool > EPSILON) {
    let allocatedDuringPass = false;

    students.forEach((student, index) => {
      const allocated = allocations.get(student.id) || 0;
      const remainingDue = roundCurrency(student.remaining_amount - allocated);

      if (remainingDue <= EPSILON) {
        return;
      }

      const monthlyFee = getMonthlyFee(student);
      const fullInstallment = roundCurrency(Math.min(monthlyFee, remainingDue));

      if (fullInstallment <= EPSILON || remainingPool + EPSILON < fullInstallment) {
        return;
      }

      allocations.set(student.id, roundCurrency(allocated + fullInstallment));
      remainingPool = roundCurrency(remainingPool - fullInstallment);
      lastAllocatedIndex = index;
      allocatedDuringPass = true;
    });

    if (!allocatedDuringPass) {
      break;
    }
  }

  if (remainingPool > EPSILON) {
    const orderedCandidates = students
      .map((student, index) => ({ student, index }))
      .sort((left, right) => {
        const leftDistance = (left.index - lastAllocatedIndex + students.length) % students.length;
        const rightDistance = (right.index - lastAllocatedIndex + students.length) % students.length;
        return leftDistance - rightDistance;
      });

    const target = orderedCandidates.find(({ student }) => {
      const allocated = allocations.get(student.id) || 0;
      return roundCurrency(student.remaining_amount - allocated) > EPSILON;
    });

    if (target) {
      const allocated = allocations.get(target.student.id) || 0;
      const remainingDue = roundCurrency(target.student.remaining_amount - allocated);
      const extraAmount = roundCurrency(Math.min(remainingPool, remainingDue));

      allocations.set(target.student.id, roundCurrency(allocated + extraAmount));
      remainingPool = roundCurrency(remainingPool - extraAmount);
    }
  }

  students.forEach((student) => {
    amounts[student.id] = (allocations.get(student.id) || 0).toFixed(2);
  });

  return amounts;
};