import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import {
  ACCESS_COOKIE_NAME,
  createAccessCookieValue,
} from "@/lib/access-cookie";
import {
  findUserByEmail,
  issueExtensionToken,
  isSubscriptionActive,
  mutateStore,
  normalizeEmail,
  readStore,
} from "@/lib/store";

interface VerifyPayload {
  email?: string;
  issueExtensionToken?: boolean;
}

export async function POST(request: Request) {
  let payload: VerifyPayload = {};
  try {
    payload = (await request.json()) as VerifyPayload;
  } catch {
    payload = {};
  }

  const session = await auth();
  const payloadEmail = payload.email?.trim();
  const userEmail = payloadEmail || session?.user?.email;

  if (!userEmail) {
    return NextResponse.json(
      { error: "Email is required to verify subscription." },
      { status: 400 }
    );
  }

  const email = normalizeEmail(userEmail);
  const store = readStore();
  const hasAccess = isSubscriptionActive(store, email);

  if (!hasAccess) {
    return NextResponse.json(
      {
        active: false,
        error:
          "No active subscription was found for this email. Complete checkout first, then verify again.",
      },
      { status: 402 }
    );
  }

  mutateStore((draft) => {
    const user = findUserByEmail(draft, email);
    if (user) {
      user.subscriptionActive = true;
    }
  });

  let extensionToken: string | undefined;
  if (payload.issueExtensionToken) {
    const freshStore = readStore();
    const user = findUserByEmail(freshStore, email);
    if (user) {
      extensionToken = issueExtensionToken(user.id);
    }
  }

  const response = NextResponse.json({
    active: true,
    email,
    extensionToken,
  });

  response.cookies.set({
    name: ACCESS_COOKIE_NAME,
    value: createAccessCookieValue(email),
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}
