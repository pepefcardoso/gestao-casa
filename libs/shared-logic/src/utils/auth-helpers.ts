import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Hashes a plaintext password using scrypt with a random salt.
 * Returns the salt and hash concatenated with a colon (salt:hash).
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Verifies a plaintext password against a stored salt:hash string.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(":");
  if (parts.length !== 2) {
    return false;
  }
  const [salt, key] = parts;
  const keyBuffer = Buffer.from(key, "hex");
  const matchBuffer = scryptSync(password, salt, 64);
  return timingSafeEqual(keyBuffer, matchBuffer);
}
