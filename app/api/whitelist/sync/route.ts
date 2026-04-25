import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import {
  DEFAULT_EXTENSION_SETTINGS,
  findUserByEmail,
  findUserByExtensionToken,
  isSubscriptionActive,
  normalizeEmail,
  readStore,
  sanitizeWhitelist,
  writeStore,
  type ExtensionSettings,
} from "@/lib/store";

interface SyncPayload {
  whitelist?: string[];
  settings?: Partial<ExtensionSettings>;
}

async function authenticateRequest(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice("Bearer ".length).trim();
    const tokenUser = findUserByExtensionToken(token);
    if (tokenUser) {
      return tokenUser;
    }
  }

  const session = await auth();
  if (!session?.user?.email) {
    return null;
  }

  const store = readStore();
  return findUserByEmail(store, session.user.email) ?? null;
}

function mergeSettings(current: ExtensionSettings, next?: Partial<ExtensionSettings>) {
  if (!next) {
    return current;
  }

  return {
    blockVideoAutoplay:
      next.blockVideoAutoplay ?? current.blockVideoAutoplay ?? true,
    blockAudioAutoplay:
      next.blockAudioAutoplay ?? current.blockAudioAutoplay ?? true,
    blockIframeAutoplay:
      next.blockIframeAutoplay ?? current.blockIframeAutoplay ?? true,
    aggressivePlayInterception:
      next.aggressivePlayInterception ??
      current.aggressivePlayInterception ??
      true,
  };
}

export async function GET(request: Request) {
  const user = await authenticateRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const store = readStore();
  const active = isSubscriptionActive(store, user.email);

  if (!active) {
    return NextResponse.json(
      { error: "Subscription required", active: false },
      { status: 402 }
    );
  }

  return NextResponse.json({
    active: true,
    whitelist: sanitizeWhitelist(user.whitelist ?? []),
    settings: mergeSettings(
      user.extensionSettings ?? DEFAULT_EXTENSION_SETTINGS,
      undefined
    ),
  });
}

export async function POST(request: Request) {
  const user = await authenticateRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const store = readStore();
  const active = isSubscriptionActive(store, user.email);

  if (!active) {
    return NextResponse.json(
      { error: "Subscription required", active: false },
      { status: 402 }
    );
  }

  let payload: SyncPayload;
  try {
    payload = (await request.json()) as SyncPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const nextWhitelist = payload.whitelist
    ? sanitizeWhitelist(payload.whitelist)
    : sanitizeWhitelist(user.whitelist ?? []);

  const normalizedEmail = normalizeEmail(user.email);
  const nextStore = readStore();
  const target = findUserByEmail(nextStore, normalizedEmail);

  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  target.whitelist = nextWhitelist;
  target.extensionSettings = mergeSettings(
    target.extensionSettings ?? DEFAULT_EXTENSION_SETTINGS,
    payload.settings
  );

  writeStore(nextStore);

  return NextResponse.json({
    success: true,
    whitelist: target.whitelist,
    settings: target.extensionSettings,
  });
}
