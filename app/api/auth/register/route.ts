import { NextResponse } from "next/server";

import { hashPassword } from "@/lib/passwords";
import { createUser, normalizeEmail } from "@/lib/store";

interface RegisterPayload {
  name?: string;
  email?: string;
  password?: string;
}

export async function POST(request: Request) {
  let payload: RegisterPayload;

  try {
    payload = (await request.json()) as RegisterPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const name = payload.name?.trim();
  const email = payload.email ? normalizeEmail(payload.email) : "";
  const password = payload.password ?? "";

  if (!name || !email || !password) {
    return NextResponse.json(
      { error: "Name, email, and password are required" },
      { status: 400 }
    );
  }

  if (password.length < 10) {
    return NextResponse.json(
      { error: "Password must be at least 10 characters" },
      { status: 400 }
    );
  }

  try {
    const user = createUser({
      name,
      email,
      passwordHash: hashPassword(password),
    });

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "USER_EXISTS") {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}
