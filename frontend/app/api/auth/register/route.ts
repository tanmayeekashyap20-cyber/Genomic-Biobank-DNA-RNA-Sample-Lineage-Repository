import { NextRequest, NextResponse } from "next/server";
import argon2 from "argon2";
import { z } from "zod";
import { pool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Roles a visitor may request. Admin accounts can only be created by an
// existing administrator from the management page.
const REQUESTABLE_ROLES = ["Researcher", "Lab Technician"] as const;

const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters.")
    .max(100)
    .regex(
      /^[A-Za-z0-9._-]+$/,
      "Username may contain letters, numbers, dots, dashes and underscores."
    ),
  email: z.string().trim().toLowerCase().email("Enter a valid email.").max(255),
  password: z
    .string()
    .min(10, "Password must be at least 10 characters.")
    .max(256),
  role: z.enum(REQUESTABLE_ROLES, {
    errorMap: () => ({ message: "Select Researcher or Lab Technician." }),
  }),
});

// Public self-registration. The account is created as pending and
// inactive; it cannot sign in until an administrator approves it.
export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid registration details." },
      { status: 400 }
    );
  }

  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const firstError = Object.values(fieldErrors).flat()[0];

    return NextResponse.json(
      {
        success: false,
        message: firstError ?? "Invalid registration details.",
        errors: fieldErrors,
      },
      { status: 400 }
    );
  }

  const { username, email, password, role } = parsed.data;

  try {
    const passwordHash = await argon2.hash(password);

    const result = await pool.query(
      `INSERT INTO public.app_user
         (username, email, password_hash, role_id, is_active, approval_status)
       SELECT $1, $2, $3, r.role_id, FALSE, 'pending'
       FROM public.role r
       WHERE r.role_name = $4
       RETURNING user_id`,
      [username, email, passwordHash, role]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, message: "Selected role is not available." },
        { status: 400 }
      );
    }

    await pool
      .query(
        `INSERT INTO public.audit_log (user_id, action, table_name, record_id, details)
         VALUES ($1, 'REGISTER', 'app_user', $1, $2)`,
        [result.rows[0].user_id, `Self-registration requesting role: ${role}`]
      )
      .catch((error) => console.error("Audit log write failed:", error));

    return NextResponse.json(
      {
        success: true,
        message:
          "Registration submitted. An administrator must approve your account before you can sign in.",
      },
      { status: 201 }
    );
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      return NextResponse.json(
        {
          success: false,
          message: "That username or email is already registered.",
        },
        { status: 409 }
      );
    }

    console.error("Registration failed:", error);

    return NextResponse.json(
      { success: false, message: "Could not complete registration." },
      { status: 500 }
    );
  }
}
