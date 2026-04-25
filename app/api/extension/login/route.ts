import { NextResponse } from "next/server";

import { verifyPassword } from "@/lib/passwords";
import {
  DEFAULT_EXTENSION_SETTINGS,
  findUserByEmail,
  issueExtensionToken,
  isSubscriptionActive,
  normalizeEmail,
  readStore,
  sanitizeWhitelist,
} from "@/lib/store";

interface LoginPayload {
  email?: string;
  password?: string;
}

export async function POST(request: Request) {
  let payload: LoginPayload;

  try {
    payload = (await request.json()) as LoginPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const email = normalizeEmail(payload.email ?? "");
  const password = payload.password ?? "";

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  const store = readStore();
  const user = findUserByEmail(store, email);

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  if (!isSubscriptionActive(store, user.email)) {
    return NextResponse.json(
      {
        error: "Active subscription required. Complete checkout and verify purchase in the dashboard.",
      },
      { status: 402 }
    );
  }

  const token = issueExtensionToken(user.id);

  return NextResponse.json({
    success: true,
    token,
    email: user.email,
    whitelist: sanitizeWhitelist(user.whitelist ?? []),
    settings: user.extensionSettings ?? DEFAULT_EXTENSION_SETTINGS,
  });
}
