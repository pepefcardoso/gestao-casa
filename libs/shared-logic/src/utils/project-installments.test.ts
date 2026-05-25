import { describe, expect, it } from "vitest";
import { projectInstallments } from "./project-installments";

describe("projectInstallments", (): void => {
  const defaultParams = {
    description: "Reforma Cozinha",
    totalAmount: 3000,
    installmentsCount: 3,
    status: "CONFIRMED" as const,
    category: "RENOVATION" as const,
    priority: "HIGH" as const,
    roomId: "some-room-uuid",
    dueDate: "2025-01-15",
  };

  it("should split the amount and set descriptions correctly", (): void => {
    const result = projectInstallments(defaultParams);

    expect(result).toHaveLength(3);
    
    // Sum of split amounts must equal totalAmount
    const sum = result.reduce((acc, curr) => acc + (curr.totalAmount ?? 0), 0);
    expect(sum).toBeCloseTo(3000, 5);

    // Each installment amount should be 1000
    for (const inst of result) {
      expect(inst.totalAmount).toBeCloseTo(1000, 5);
      expect(inst.installmentsCount).toBe(3);
      expect(inst.status).toBe("CONFIRMED");
      expect(inst.category).toBe("RENOVATION");
      expect(inst.priority).toBe("HIGH");
      expect(inst.roomId).toBe("some-room-uuid");
    }

    // Verify description suffix
    expect(result[0].description).toBe("Reforma Cozinha (1/3)");
    expect(result[1].description).toBe("Reforma Cozinha (2/3)");
    expect(result[2].description).toBe("Reforma Cozinha (3/3)");
  });

  it("should propagate due dates correctly monthly", (): void => {
    const result = projectInstallments(defaultParams);

    expect(result[0].dueDate).toBeInstanceOf(Date);
    
    // 2025-01-15 UTC representation (or local depending on new Date parsing, but standard Date behavior is tested)
    const d0 = result[0].dueDate as Date;
    const d1 = result[1].dueDate as Date;
    const d2 = result[2].dueDate as Date;

    expect(d0.getUTCDate()).toBe(15);
    expect(d0.getUTCMonth()).toBe(0); // January
    expect(d0.getUTCFullYear()).toBe(2025);

    expect(d1.getUTCDate()).toBe(15);
    expect(d1.getUTCMonth()).toBe(1); // February
    expect(d1.getUTCFullYear()).toBe(2025);

    expect(d2.getUTCDate()).toBe(15);
    expect(d2.getUTCMonth()).toBe(2); // March
    expect(d2.getUTCFullYear()).toBe(2025);
  });

  it("should handle boundary term of 1 month", (): void => {
    const result = projectInstallments({
      ...defaultParams,
      installmentsCount: 1,
    });

    expect(result).toHaveLength(1);
    expect(result[0].totalAmount).toBeCloseTo(3000, 5);
    expect(result[0].description).toBe("Reforma Cozinha (1/1)");
  });

  it("should handle boundary term of 360 months", (): void => {
    const result = projectInstallments({
      ...defaultParams,
      installmentsCount: 360,
    });

    expect(result).toHaveLength(360);
    expect(result[0].totalAmount).toBeCloseTo(3000 / 360, 5);
    expect(result[359].description).toBe("Reforma Cozinha (360/360)");
  });

  it("should handle date clamping boundary (e.g. Jan 31 + 1 month -> Feb 28/29)", (): void => {
    // 2024-01-31 (leap year)
    const resultLeap = projectInstallments({
      ...defaultParams,
      dueDate: "2024-01-31",
      installmentsCount: 3,
    });

    const dLeap0 = resultLeap[0].dueDate as Date;
    const dLeap1 = resultLeap[1].dueDate as Date;
    const dLeap2 = resultLeap[2].dueDate as Date;

    expect(dLeap0.getUTCDate()).toBe(31);
    expect(dLeap0.getUTCMonth()).toBe(0); // Jan

    expect(dLeap1.getUTCDate()).toBe(29); // Feb 29 (leap year)
    expect(dLeap1.getUTCMonth()).toBe(1); // Feb

    expect(dLeap2.getUTCDate()).toBe(31); // Mar 31
    expect(dLeap2.getUTCMonth()).toBe(2); // Mar

    // 2025-01-31 (non-leap year)
    const resultNonLeap = projectInstallments({
      ...defaultParams,
      dueDate: "2025-01-31",
      installmentsCount: 3,
    });

    const dNonLeap0 = resultNonLeap[0].dueDate as Date;
    const dNonLeap1 = resultNonLeap[1].dueDate as Date;
    const dNonLeap2 = resultNonLeap[2].dueDate as Date;

    expect(dNonLeap0.getUTCDate()).toBe(31);
    expect(dNonLeap1.getUTCDate()).toBe(28); // Feb 28 (non-leap year)
    expect(dNonLeap2.getUTCDate()).toBe(31); // Mar 31
  });

  it("should reject negative or zero values by throwing an error", (): void => {
    // Zero installments count
    expect((): void => {
      projectInstallments({
        ...defaultParams,
        installmentsCount: 0,
      });
    }).toThrow("Total amount and installments count must be greater than 0");

    // Negative installments count
    expect((): void => {
      projectInstallments({
        ...defaultParams,
        installmentsCount: -3,
      });
    }).toThrow("Total amount and installments count must be greater than 0");

    // Zero total amount
    expect((): void => {
      projectInstallments({
        ...defaultParams,
        totalAmount: 0,
      });
    }).toThrow("Total amount and installments count must be greater than 0");

    // Negative total amount
    expect((): void => {
      projectInstallments({
        ...defaultParams,
        totalAmount: -1500,
      });
    }).toThrow("Total amount and installments count must be greater than 0");
  });

  it("should handle nullable or missing roomId and default to null", (): void => {
    const result = projectInstallments({
      ...defaultParams,
      roomId: undefined,
    });

    expect(result[0].roomId).toBeNull();
  });
});
