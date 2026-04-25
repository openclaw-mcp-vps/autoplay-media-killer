import crypto from "node:crypto";

const HASH_BYTES = 64;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, HASH_BYTES).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, original] = storedHash.split(":");
  if (!salt || !original) {
    return false;
  }

  const derived = crypto.scryptSync(password, salt, HASH_BYTES).toString("hex");
  const originalBuffer = Buffer.from(original, "hex");
  const derivedBuffer = Buffer.from(derived, "hex");

  if (originalBuffer.length !== derivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(originalBuffer, derivedBuffer);
}
