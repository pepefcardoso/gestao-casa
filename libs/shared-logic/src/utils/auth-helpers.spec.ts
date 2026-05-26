import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./auth-helpers";

describe("auth-helpers", () => {
  it("should securely hash a password and verify it successfully", () => {
    const pwd = "mySecurePassword123";
    const hashed = hashPassword(pwd);

    expect(hashed).toBeDefined();
    expect(hashed).toContain(":");

    // Verify it works
    const isValid = verifyPassword(pwd, hashed);
    expect(isValid).toBe(true);

    // Verify incorrect password fails
    const isInvalid = verifyPassword("wrongpassword", hashed);
    expect(isInvalid).toBe(false);
  });

  it("should return false for invalid formatted hashes", () => {
    expect(verifyPassword("pwd", "no-colon-hash")).toBe(false);
    expect(verifyPassword("pwd", "")).toBe(false);
  });
});
