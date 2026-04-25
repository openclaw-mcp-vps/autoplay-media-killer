import { NextResponse } from "next/server";

import {
  findUserByExtensionToken,
  isSubscriptionActive,
  readStore,
} from "@/lib/store";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.slice("Bearer ".length).trim();
  const user = findUserByExtensionToken(token);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const active = isSubscriptionActive(readStore(), user.email);

  return NextResponse.json({
    active,
    email: user.email,
    updatedAt: new Date().toISOString(),
  });
}
