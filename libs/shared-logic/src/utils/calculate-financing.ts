export interface FinancingParams {
  propertyValue: number;
  downPayment: number;
  termMonths: number;
  interestRate: number; // annual rate, e.g., 0.10 for 10%
  amortizationSystem: "SAC" | "PRICE";
  firstParcelOverride?: number;
  lastParcelOverride?: number;
}

export interface FinancingInstallment {
  month: number;
  installment: number;
  interest: number;
  amortization: number;
  outstandingBalance: number;
}

/**
 * Calculates the financing amortization schedule using SAC or PRICE system.
 * Apply overrides for the first and last installments and distributes the delta
 * proportionally across intermediate rows (months 2 to N-1).
 */
export function calculateFinancing(params: FinancingParams): FinancingInstallment[] {
  const {
    propertyValue,
    downPayment,
    termMonths,
    interestRate,
    amortizationSystem,
    firstParcelOverride,
    lastParcelOverride,
  } = params;

  const financedAmount = propertyValue - downPayment;

  // Prevent invalid math operations or divisions by zero
  if (financedAmount <= 0 || termMonths <= 0) {
    return [];
  }

  // Calculate monthly compound interest rate from annual rate: (1 + annual_rate) ^ (1/12) - 1
  const monthlyRate = (1 + interestRate) ** (1 / 12) - 1;

  const installments: FinancingInstallment[] = [];
  let outstandingBalance = financedAmount;

  if (amortizationSystem === "SAC") {
    const amortization = financedAmount / termMonths;

    for (let m = 1; m <= termMonths; m++) {
      const interest = outstandingBalance * monthlyRate;
      const installment = amortization + interest;
      const nextOutstandingBalance = outstandingBalance - amortization;

      installments.push({
        month: m,
        installment,
        interest,
        amortization,
        outstandingBalance: nextOutstandingBalance,
      });

      outstandingBalance = nextOutstandingBalance;
    }
  } else {
    // PRICE system: Constant Installment formula
    let baseInstallment = 0;
    if (monthlyRate === 0) {
      baseInstallment = financedAmount / termMonths;
    } else {
      baseInstallment = financedAmount * (monthlyRate / (1 - (1 + monthlyRate) ** -termMonths));
    }

    for (let m = 1; m <= termMonths; m++) {
      const interest = outstandingBalance * monthlyRate;
      const amortization = baseInstallment - interest;
      const nextOutstandingBalance = outstandingBalance - amortization;

      installments.push({
        month: m,
        installment: baseInstallment,
        interest,
        amortization,
        outstandingBalance: nextOutstandingBalance,
      });

      outstandingBalance = nextOutstandingBalance;
    }
  }

  const hasFirstOverride = firstParcelOverride !== undefined && firstParcelOverride !== null;
  const hasLastOverride = lastParcelOverride !== undefined && lastParcelOverride !== null;

  // Return base calculation early if no overrides are requested
  if (!hasFirstOverride && !hasLastOverride) {
    return installments;
  }

  let totalDelta = 0;

  if (hasFirstOverride && installments.length > 0) {
    const originalInstallment = installments[0].installment;
    const delta = originalInstallment - firstParcelOverride;
    totalDelta += delta;

    installments[0].installment = firstParcelOverride;
    installments[0].amortization = firstParcelOverride - installments[0].interest;
  }

  if (hasLastOverride && installments.length > 0) {
    const lastIndex = installments.length - 1;
    const originalInstallment = installments[lastIndex].installment;
    const delta = originalInstallment - lastParcelOverride;
    totalDelta += delta;

    installments[lastIndex].installment = lastParcelOverride;
    installments[lastIndex].amortization = lastParcelOverride - installments[lastIndex].interest;
  }

  // The financial engine distributes the remaining rounding delta across intermediate rows
  // (2 to N-1) as mandated by mortgage amortization rules to ensure overall balance parity.
  const numIntermediateRows = termMonths - 2;
  if (totalDelta !== 0 && numIntermediateRows > 0) {
    let intermediateSum = 0;
    for (let i = 1; i <= termMonths - 2; i++) {
      intermediateSum += installments[i].installment;
    }

    if (intermediateSum > 0) {
      for (let i = 1; i <= termMonths - 2; i++) {
        const originalInstallment = installments[i].installment;
        const proportion = originalInstallment / intermediateSum;
        const adjustment = totalDelta * proportion;
        const newInstallment = originalInstallment + adjustment;

        installments[i].installment = newInstallment;
        installments[i].amortization = newInstallment - installments[i].interest;
      }
    }
  }

  // Sequentially update outstanding balances because amortizations changed due to overrides
  let currentBalance = financedAmount;
  for (let i = 0; i < installments.length; i++) {
    currentBalance -= installments[i].amortization;
    installments[i].outstandingBalance = currentBalance;
  }

  return installments;
}
