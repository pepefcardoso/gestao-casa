import { describe, expect, it } from "vitest";
import { uuidSchema } from "./schema";

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
