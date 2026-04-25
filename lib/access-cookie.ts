import crypto from "node:crypto";

const COOKIE_SECRET =
  process.env.STRIPE_WEBHOOK_SECRET ?? "dev-only-change-this-before-production";

export const ACCESS_COOKIE_NAME = "ak_access";
const TTL_MS = 1000 * 60 * 60 * 24 * 30;

interface AccessPayload {
  email: string;
  exp: number;
}

function signPayload(payload: AccessPayload): string {
  return crypto
    .createHmac("sha256", COOKIE_SECRET)
    .update(`${payload.email}:${payload.exp}`)
    .digest("hex");
}

export function createAccessCookieValue(email: string): string {
  const payload: AccessPayload = {
    email: email.toLowerCase().trim(),
    exp: Date.now() + TTL_MS,
  };

  const signed = {
    ...payload,
    sig: signPayload(payload),
  };

  return Buffer.from(JSON.stringify(signed), "utf8").toString("base64url");
}

export function readAccessCookieValue(
  cookieValue: string | undefined
): AccessPayload | null {
  if (!cookieValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(cookieValue, "base64url").toString("utf8")
    ) as AccessPayload & { sig: string };

    if (!parsed.email || !parsed.exp || !parsed.sig) {
      return null;
    }

    if (Date.now() > parsed.exp) {
      return null;
    }

    const expected = signPayload({ email: parsed.email, exp: parsed.exp });
    const expectedBuffer = Buffer.from(expected, "utf8");
    const actualBuffer = Buffer.from(parsed.sig, "utf8");

    if (expectedBuffer.length !== actualBuffer.length) {
      return null;
    }

    if (!crypto.timingSafeEqual(expectedBuffer, actualBuffer)) {
      return null;
    }

    return { email: parsed.email, exp: parsed.exp };
  } catch {
    return null;
  }
}
