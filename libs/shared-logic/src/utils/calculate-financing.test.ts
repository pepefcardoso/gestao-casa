import { describe, expect, it } from "vitest";
import { calculateFinancing } from "./calculate-financing";

describe("calculateFinancing", (): void => {
  const defaultParams = {
    propertyValue: 500000,
    downPayment: 100000,
    termMonths: 12,
    interestRate: 0.1, // 10% annual interest rate
    amortizationSystem: "SAC" as const,
  };

  it("should calculate correctly for the SAC system", (): void => {
    const result = calculateFinancing(defaultParams);

    expect(result).toHaveLength(12);

    const expectedAmortization = 400000 / 12; // (500000 - 100000) / 12 = 33333.333...

    // In SAC, amortization is constant
    for (const inst of result) {
      expect(inst.amortization).toBeCloseTo(expectedAmortization, 5);
      expect(inst.installment).toBeCloseTo(inst.amortization + inst.interest, 5);
    }

    // Installments and interest should decrease over time
    for (let i = 1; i < result.length; i++) {
      expect(result[i].interest).toBeLessThan(result[i - 1].interest);
      expect(result[i].installment).toBeLessThan(result[i - 1].installment);
    }

    // Outstanding balance should end at 0
    expect(result[result.length - 1].outstandingBalance).toBeCloseTo(0, 5);
  });

  it("should calculate correctly for the PRICE system", (): void => {
    const result = calculateFinancing({
      ...defaultParams,
      amortizationSystem: "PRICE",
    });

    expect(result).toHaveLength(12);

    // In PRICE, installment is constant
    const baseInstallment = result[0].installment;
    for (const inst of result) {
      expect(inst.installment).toBeCloseTo(baseInstallment, 5);
      expect(inst.installment).toBeCloseTo(inst.amortization + inst.interest, 5);
    }

    // Interest decreases and amortization increases over time
    for (let i = 1; i < result.length; i++) {
      expect(result[i].interest).toBeLessThan(result[i - 1].interest);
      expect(result[i].amortization).toBeGreaterThan(result[i - 1].amortization);
    }

    // Outstanding balance should end at 0
    expect(result[result.length - 1].outstandingBalance).toBeCloseTo(0, 5);
  });

  it("should handle the boundary case of a 1-month term", (): void => {
    const result = calculateFinancing({
      ...defaultParams,
      termMonths: 1,
    });

    expect(result).toHaveLength(1);
    expect(result[0].amortization).toBeCloseTo(400000, 5);
    expect(result[0].outstandingBalance).toBeCloseTo(0, 5);
  });

  it("should handle the boundary case of a 360-month term", (): void => {
    const result = calculateFinancing({
      ...defaultParams,
      termMonths: 360,
    });

    expect(result).toHaveLength(360);
    expect(result[359].outstandingBalance).toBeCloseTo(0, 2);
  });

  it("should return an empty array if termMonths is 0 or negative", (): void => {
    const zeroResult = calculateFinancing({
      ...defaultParams,
      termMonths: 0,
    });
    expect(zeroResult).toEqual([]);

    const negativeResult = calculateFinancing({
      ...defaultParams,
      termMonths: -5,
    });
    expect(negativeResult).toEqual([]);
  });

  it("should return an empty array if financedAmount is 0 or negative", (): void => {
    // 0 financed amount (down payment equals property value)
    const zeroResult = calculateFinancing({
      ...defaultParams,
      downPayment: 500000,
    });
    expect(zeroResult).toEqual([]);

    // Negative financed amount (down payment exceeds property value)
    const negativeResult = calculateFinancing({
      ...defaultParams,
      downPayment: 600000,
    });
    expect(negativeResult).toEqual([]);

    // Negative property value
    const negativePropResult = calculateFinancing({
      ...defaultParams,
      propertyValue: -100000,
      downPayment: 0,
    });
    expect(negativePropResult).toEqual([]);
  });

  it("should apply firstParcelOverride correctly and distribute the delta proportionally", (): void => {
    const originalResult = calculateFinancing(defaultParams);
    const originalFirstInstallment = originalResult[0].installment;

    // Apply firstParcelOverride of originalFirstInstallment - 10000
    const targetOverride = originalFirstInstallment - 10000;
    const overriddenResult = calculateFinancing({
      ...defaultParams,
      firstParcelOverride: targetOverride,
    });

    expect(overriddenResult).toHaveLength(12);
    expect(overriddenResult[0].installment).toBeCloseTo(targetOverride, 5);

    // Delta should be distributed across intermediate rows (months 2 to 11)
    // The last parcel (index 11 / month 12) should be unaffected (same as original, modulo potential rounding updates?)
    // Wait, the logic updates outstanding balances at the end:
    // "Sequentially update outstanding balances because amortizations changed due to overrides"
    // Let's verify that the outstanding balance at index 11 is still 0.
    expect(overriddenResult[11].outstandingBalance).toBeCloseTo(0, 5);

    // Let's check that intermediate installments are adjusted
    for (let i = 1; i <= 10; i++) {
      expect(overriddenResult[i].installment).toBeGreaterThan(originalResult[i].installment);
    }
  });

  it("should apply lastParcelOverride correctly and distribute the delta proportionally", (): void => {
    const originalResult = calculateFinancing(defaultParams);
    const originalLastInstallment = originalResult[11].installment;

    const targetOverride = originalLastInstallment - 5000;
    const overriddenResult = calculateFinancing({
      ...defaultParams,
      lastParcelOverride: targetOverride,
    });

    expect(overriddenResult).toHaveLength(12);
    expect(overriddenResult[11].installment).toBeCloseTo(targetOverride, 5);
    expect(overriddenResult[11].outstandingBalance).toBeCloseTo(0, 5);

    // Intermediate installments (months 2 to 11) should be adjusted
    for (let i = 1; i <= 10; i++) {
      expect(overriddenResult[i].installment).toBeGreaterThan(originalResult[i].installment);
    }
  });

  it("should apply both overrides correctly and distribute cumulative delta", (): void => {
    const originalResult = calculateFinancing(defaultParams);
    const originalFirst = originalResult[0].installment;
    const originalLast = originalResult[11].installment;

    const overriddenResult = calculateFinancing({
      ...defaultParams,
      firstParcelOverride: originalFirst - 5000,
      lastParcelOverride: originalLast - 5000,
    });

    expect(overriddenResult).toHaveLength(12);
    expect(overriddenResult[0].installment).toBeCloseTo(originalFirst - 5000, 5);
    expect(overriddenResult[11].installment).toBeCloseTo(originalLast - 5000, 5);
    expect(overriddenResult[11].outstandingBalance).toBeCloseTo(0, 5);
  });

  it("should handle overrides of exactly R$ 0", (): void => {
    const overriddenResult = calculateFinancing({
      ...defaultParams,
      firstParcelOverride: 0,
      lastParcelOverride: 0,
    });

    expect(overriddenResult).toHaveLength(12);
    expect(overriddenResult[0].installment).toBe(0);
    expect(overriddenResult[11].installment).toBe(0);
    expect(overriddenResult[11].outstandingBalance).toBeCloseTo(0, 5);
  });
});
