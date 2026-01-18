import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const APP_PASSWORD = process.env.APP_PASSWORD || "password";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function generateDeviceToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// POST - Login with password
export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json({ error: "Password required" }, { status: 400 });
    }

    if (password !== APP_PASSWORD) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    const deviceToken = generateDeviceToken();
    const tokenHash = hashPassword(deviceToken + APP_PASSWORD);

    return NextResponse.json({
      success: true,
      deviceToken,
      tokenHash,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}

// PUT - Validate existing session
export async function PUT(request: NextRequest) {
  try {
    const { deviceToken, tokenHash } = await request.json();

    if (!deviceToken || !tokenHash) {
      return NextResponse.json({ valid: false });
    }

    const expectedHash = hashPassword(deviceToken + APP_PASSWORD);
    const valid = tokenHash === expectedHash;

    return NextResponse.json({ valid });
  } catch (error) {
    console.error("Session validation error:", error);
    return NextResponse.json({ valid: false });
  }
}
