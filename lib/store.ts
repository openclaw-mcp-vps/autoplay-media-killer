import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const STORE_PATH = path.join(process.cwd(), "data", "store.json");

export type SubscriptionSource = "stripe_webhook" | "manual_verify" | "seed";

export interface ExtensionSettings {
  blockVideoAutoplay: boolean;
  blockAudioAutoplay: boolean;
  blockIframeAutoplay: boolean;
  aggressivePlayInterception: boolean;
}

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: string;
  subscriptionActive: boolean;
  whitelist: string[];
  extensionSettings: ExtensionSettings;
}

export interface PurchaseRecord {
  id: string;
  email: string;
  status: "active" | "inactive";
  source: SubscriptionSource;
  stripeEventId?: string;
  createdAt: string;
}

export interface ExtensionTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  createdAt: string;
  lastUsedAt: string;
}

export interface StoreData {
  users: UserRecord[];
  purchases: PurchaseRecord[];
  extensionTokens: ExtensionTokenRecord[];
}

export const DEFAULT_EXTENSION_SETTINGS: ExtensionSettings = {
  blockVideoAutoplay: true,
  blockAudioAutoplay: true,
  blockIframeAutoplay: true,
  aggressivePlayInterception: true,
};

const EMPTY_STORE: StoreData = {
  users: [],
  purchases: [],
  extensionTokens: [],
};

function ensureStoreFile() {
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(STORE_PATH)) {
    fs.writeFileSync(STORE_PATH, JSON.stringify(EMPTY_STORE, null, 2), "utf8");
  }
}

function parseStore(raw: string): StoreData {
  try {
    const parsed = JSON.parse(raw) as Partial<StoreData>;
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      purchases: Array.isArray(parsed.purchases) ? parsed.purchases : [],
      extensionTokens: Array.isArray(parsed.extensionTokens)
        ? parsed.extensionTokens
        : [],
    };
  } catch {
    return structuredClone(EMPTY_STORE);
  }
}

export function readStore(): StoreData {
  ensureStoreFile();
  const content = fs.readFileSync(STORE_PATH, "utf8");
  return parseStore(content);
}

export function writeStore(store: StoreData) {
  ensureStoreFile();
  const tempPath = `${STORE_PATH}.${process.pid}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(store, null, 2), "utf8");
  fs.renameSync(tempPath, STORE_PATH);
}

export function mutateStore(mutator: (store: StoreData) => void): StoreData {
  const store = readStore();
  mutator(store);
  writeStore(store);
  return store;
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizeDomain(input: string): string {
  const candidate = input.trim().toLowerCase();
  if (!candidate) {
    return "";
  }

  const wildcard = candidate.startsWith("*.") ? "*." : "";
  const withoutWildcard = wildcard ? candidate.slice(2) : candidate;

  const withScheme = withoutWildcard.includes("//")
    ? withoutWildcard
    : `https://${withoutWildcard}`;

  try {
    const url = new URL(withScheme);
    return `${wildcard}${url.hostname}`;
  } catch {
    return "";
  }
}

export function sanitizeWhitelist(domains: string[]): string[] {
  return [...new Set(domains.map(normalizeDomain).filter(Boolean))].slice(0, 500);
}

export function findUserByEmail(store: StoreData, email: string) {
  const normalized = normalizeEmail(email);
  return store.users.find((user) => user.email === normalized);
}

export function createUser({
  email,
  name,
  passwordHash,
}: {
  email: string;
  name: string;
  passwordHash: string;
}): UserRecord {
  const now = new Date().toISOString();

  const user: UserRecord = {
    id: crypto.randomUUID(),
    email: normalizeEmail(email),
    name: name.trim(),
    passwordHash,
    createdAt: now,
    subscriptionActive: false,
    whitelist: [],
    extensionSettings: { ...DEFAULT_EXTENSION_SETTINGS },
  };

  mutateStore((store) => {
    const existing = findUserByEmail(store, email);
    if (existing) {
      throw new Error("USER_EXISTS");
    }
    store.users.push(user);
  });

  return user;
}

export function isSubscriptionActive(store: StoreData, email: string): boolean {
  const normalized = normalizeEmail(email);
  const hasActivePurchase = store.purchases
    .filter((purchase) => purchase.email === normalized)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]?.status;

  const user = findUserByEmail(store, normalized);
  return Boolean(
    user?.subscriptionActive || (hasActivePurchase && hasActivePurchase === "active")
  );
}

export function setSubscriptionState({
  email,
  active,
  source,
  stripeEventId,
}: {
  email: string;
  active: boolean;
  source: SubscriptionSource;
  stripeEventId?: string;
}) {
  const normalizedEmail = normalizeEmail(email);
  mutateStore((store) => {
    const user = findUserByEmail(store, normalizedEmail);
    if (user) {
      user.subscriptionActive = active;
    }

    const purchase: PurchaseRecord = {
      id: crypto.randomUUID(),
      email: normalizedEmail,
      status: active ? "active" : "inactive",
      source,
      stripeEventId,
      createdAt: new Date().toISOString(),
    };

    store.purchases.push(purchase);
  });
}

export function issueExtensionToken(userId: string): string {
  const rawToken = `ak_${crypto.randomBytes(24).toString("hex")}`;
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  mutateStore((store) => {
    store.extensionTokens.push({
      id: crypto.randomUUID(),
      userId,
      tokenHash,
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
    });
  });

  return rawToken;
}

export function findUserByExtensionToken(token: string): UserRecord | null {
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const store = readStore();
  const tokenRecord = store.extensionTokens.find((entry) => entry.tokenHash === tokenHash);

  if (!tokenRecord) {
    return null;
  }

  mutateStore((draft) => {
    const target = draft.extensionTokens.find((entry) => entry.id === tokenRecord.id);
    if (target) {
      target.lastUsedAt = new Date().toISOString();
    }
  });

  const user = store.users.find((entry) => entry.id === tokenRecord.userId) ?? null;
  return user;
}
