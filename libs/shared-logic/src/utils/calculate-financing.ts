export interface FinancingParams {
  propertyValue: number;
  downPayment: number;
  termMonths: number;
  interestRate: number; // annual rate, e.g., 0.10 for 10%
  amortizationSystem: "SAC" | "PRICE";
  firstParcelOverride?: number;
  lastParcelOverride?: number;
  adminFee?: number;
  mipRate?: number;
  dfiRate?: number;
  trRate?: number;
  interestMethod?: "compound" | "linear";
}

export interface FinancingInstallment {
  month: number;
  installment: number;
  interest: number;
  amortization: number;
  outstandingBalance: number;
  adminFee: number;
  mip: number;
  dfi: number;
  trCorrection: number;
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
    adminFee = 0,
    mipRate = 0,
    dfiRate = 0,
    trRate = 0,
    interestMethod = "compound",
  } = params;

  const financedAmount = propertyValue - downPayment;

  // Prevent invalid math operations or divisions by zero
  if (financedAmount <= 0 || termMonths <= 0) {
    return [];
  }

  // Calculate monthly rate:
  // - Linear (Caixa method): annual_rate / 12
  // - Compound (Standard method): (1 + annual_rate) ^ (1/12) - 1
  const monthlyRate =
    interestMethod === "linear" ? interestRate / 12 : (1 + interestRate) ** (1 / 12) - 1;

  const installments: FinancingInstallment[] = [];
  let outstandingBalance = financedAmount;

  if (amortizationSystem === "SAC") {
    const amortization = financedAmount / termMonths;

    for (let m = 1; m <= termMonths; m++) {
      // 1. Correct outstanding balance by TR
      const trCorrection = outstandingBalance * trRate;
      const correctedBalance = outstandingBalance + trCorrection;

      // 2. Compute components
      const interest = correctedBalance * monthlyRate;
      const mip = correctedBalance * mipRate;
      const dfi = propertyValue * dfiRate;

      const baseInstallment = amortization + interest;
      const installment = baseInstallment + adminFee + mip + dfi;
      const nextOutstandingBalance = correctedBalance - amortization;

      installments.push({
        month: m,
        installment,
        interest,
        amortization,
        outstandingBalance: nextOutstandingBalance,
        adminFee,
        mip,
        dfi,
        trCorrection,
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
      // 1. Correct outstanding balance by TR
      const trCorrection = outstandingBalance * trRate;
      const correctedBalance = outstandingBalance + trCorrection;

      // 2. Compute components
      const interest = correctedBalance * monthlyRate;
      const amortization = baseInstallment - interest;
      const mip = correctedBalance * mipRate;
      const dfi = propertyValue * dfiRate;

      const installment = baseInstallment + adminFee + mip + dfi;
      const nextOutstandingBalance = correctedBalance - amortization;

      installments.push({
        month: m,
        installment,
        interest,
        amortization,
        outstandingBalance: nextOutstandingBalance,
        adminFee,
        mip,
        dfi,
        trCorrection,
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
    installments[0].amortization =
      firstParcelOverride -
      installments[0].interest -
      installments[0].adminFee -
      installments[0].mip -
      installments[0].dfi;
  }

  if (hasLastOverride && installments.length > 0) {
    const lastIndex = installments.length - 1;
    const originalInstallment = installments[lastIndex].installment;
    const delta = originalInstallment - lastParcelOverride;
    totalDelta += delta;

    installments[lastIndex].installment = lastParcelOverride;
    installments[lastIndex].amortization =
      lastParcelOverride -
      installments[lastIndex].interest -
      installments[lastIndex].adminFee -
      installments[lastIndex].mip -
      installments[lastIndex].dfi;
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
        installments[i].amortization =
          newInstallment -
          installments[i].interest -
          installments[i].adminFee -
          installments[i].mip -
          installments[i].dfi;
      }
    }
  }

  // Sequentially update outstanding balances because amortizations changed due to overrides
  let currentBalance = financedAmount;
  for (let i = 0; i < installments.length; i++) {
    const trCorrection = currentBalance * trRate;
    installments[i].trCorrection = trCorrection;
    currentBalance += trCorrection;
    currentBalance -= installments[i].amortization;
    installments[i].outstandingBalance = currentBalance;
  }

  return installments;
}
