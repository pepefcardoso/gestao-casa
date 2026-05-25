import { describe, expect, it } from "vitest";
import { insertHouseSchema, insertIncomeSchema, uuidSchema } from "./schema";

describe("uuidSchema", (): void => {
  it("should parse standard RFC4122 compliant UUIDs successfully", (): void => {
    const validUUIDs = [
      "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "835bdea0-3058-43fa-8130-d3b2c86c84c7",
      "00000000-0000-0000-0000-000000000000",
      "ffffffff-ffff-ffff-ffff-ffffffffffff",
    ];

    for (const uuid of validUUIDs) {
      expect(uuidSchema.safeParse(uuid).success).toBe(true);
    }
  });

  it("should parse mock/non-RFC4122 compliant UUIDs successfully (e.g. all 1s or 2s)", (): void => {
    const mockUUIDs = [
      "11111111-1111-1111-1111-111111111111",
      "22222222-2222-2222-2222-222222222222",
      "12345678-1234-1234-1234-1234567890ab",
    ];

    for (const uuid of mockUUIDs) {
      expect(uuidSchema.safeParse(uuid).success).toBe(true);
    }
  });

  it("should reject invalid/malformed UUIDs", (): void => {
    const invalidUUIDs = [
      "111111111111-1111-1111-111111111111", // missing hyphens
      "11111111-1111-1111-1111-11111111111", // too short
      "11111111-1111-1111-1111-1111111111111", // too long
      "g1111111-1111-1111-1111-111111111111", // invalid hex characters
      "", // empty string
      "uuid-string", // plain text
    ];

    for (const uuid of invalidUUIDs) {
      expect(uuidSchema.safeParse(uuid).success).toBe(false);
    }
  });
});

describe("insertIncomeSchema", (): void => {
  it("should parse a valid income record successfully", (): void => {
    const validIncome = {
      description: "Salário",
      amount: 5000,
      status: "CONFIRMED",
      category: "SALARY",
      dueDate: new Date("2026-05-25"),
    };

    expect(insertIncomeSchema.safeParse(validIncome).success).toBe(true);
  });

  it("should parse an amount as a string if it's numeric", (): void => {
    const validIncome = {
      description: "Freelance",
      amount: "1500.50",
      status: "BUDGET",
      category: "OTHER",
      dueDate: "2026-05-25",
    };

    expect(insertIncomeSchema.safeParse(validIncome).success).toBe(true);
  });

  it("should reject a negative or zero amount", (): void => {
    const invalidIncome1 = {
      description: "Negative amount",
      amount: -5,
      status: "CONFIRMED",
      category: "INVESTMENT",
      dueDate: new Date(),
    };

    const invalidIncome2 = {
      description: "Zero amount",
      amount: 0,
      status: "CONFIRMED",
      category: "INVESTMENT",
      dueDate: new Date(),
    };

    expect(insertIncomeSchema.safeParse(invalidIncome1).success).toBe(false);
    expect(insertIncomeSchema.safeParse(invalidIncome2).success).toBe(false);
  });
});

describe("insertHouseSchema", (): void => {
  it("should parse a valid house record successfully with or without coordinates", (): void => {
    const validHouseWithoutCoords = {
      name: "Casa de Praia",
      location: "Guarujá, SP",
      totalArea: 150,
    };

    const validHouseWithCoords = {
      name: "Casa de Campo",
      location: "Atibaia, SP",
      totalArea: 250,
      latitude: -23.1189,
      longitude: -46.5511,
    };

    expect(insertHouseSchema.safeParse(validHouseWithoutCoords).success).toBe(true);
    expect(insertHouseSchema.safeParse(validHouseWithCoords).success).toBe(true);
  });

  it("should reject out of bounds coordinates", (): void => {
    const invalidLat = {
      name: "Invalid Lat",
      latitude: 120,
    };

    const invalidLatNegative = {
      name: "Invalid Lat Neg",
      latitude: -95,
    };

    const invalidLon = {
      name: "Invalid Lon",
      longitude: 185,
    };

    const invalidLonNegative = {
      name: "Invalid Lon Neg",
      longitude: -181,
    };

    expect(insertHouseSchema.safeParse(invalidLat).success).toBe(false);
    expect(insertHouseSchema.safeParse(invalidLatNegative).success).toBe(false);
    expect(insertHouseSchema.safeParse(invalidLon).success).toBe(false);
    expect(insertHouseSchema.safeParse(invalidLonNegative).success).toBe(false);
  });
});
