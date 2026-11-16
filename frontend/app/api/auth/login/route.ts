
import { NextRequest, NextResponse } from "next/server";
import argon2 from "argon2";
import { pool } from "@/lib/db";
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
  type SessionUser,
} from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_ROLES = ["Admin", "Researcher", "Lab Technician"];

export async function POST(request: NextRequest) {
  try {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 400 }
      );
    }

    if (
      typeof body !== "object" ||
      body === null ||
      Array.isArray(body)
    ) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 400 }
      );
    }

    const input = body as Record<string, unknown>;

    const email =
      typeof input.email === "string"
        ? input.email.trim().toLowerCase()
        : "";

    const password =
      typeof input.password === "string"
        ? input.password
        : "";

    if (
      !email ||
      email.length > 255 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !password ||
      password.length > 256
    ) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `SELECT
         u.user_id,
         u.username,
         u.email,
         u.password_hash,
         u.researcher_id,
         u.is_active,
         u.approval_status,
         r.role_name
       FROM public.app_user u
       JOIN public.role r ON r.role_id = u.role_id
       WHERE LOWER(u.email) = $1
       LIMIT 1`,
      [email]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const account = result.rows[0];

    if (
      typeof account.password_hash !== "string" ||
      !ALLOWED_ROLES.includes(account.role_name)
    ) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    let passwordIsValid = false;

    try {
      passwordIsValid = await argon2.verify(
        account.password_hash,
        password
      );
    } catch {
      passwordIsValid = false;
    }

    if (!passwordIsValid) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    // Only reveal account status after the password has been verified,
    // so the form cannot be used to probe which emails are registered.
    if (account.approval_status === "pending") {
      return NextResponse.json(
        {
          error:
            "Your registration is awaiting administrator approval. You can sign in once it has been approved.",
        },
        { status: 403 }
      );
    }

    if (account.approval_status === "rejected") {
      return NextResponse.json(
        { error: "Your registration was not approved. Contact an administrator." },
        { status: 403 }
      );
    }

    if (account.is_active !== true) {
      return NextResponse.json(
        { error: "This account has been deactivated. Contact an administrator." },
        { status: 403 }
      );
    }

    const user: SessionUser = {
      userId: Number(account.user_id),
      username: account.username,
      email: account.email,
      role: account.role_name,
      researcherId:
        account.researcher_id === null
          ? null
          : Number(account.researcher_id),
    };

    const token = await createSessionToken(user);

    const response = NextResponse.json({
      message: "Login successful.",
      user,
    });

    response.cookies.set(
      SESSION_COOKIE_NAME,
      token,
      sessionCookieOptions
    );

    return response;
  } catch (error) {
    console.error("Login API error:", error);

    return NextResponse.json(
      { error: "Unable to process login." },
      { status: 500 }
    );
  }
}
