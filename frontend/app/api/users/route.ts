
import { NextRequest, NextResponse } from "next/server";
import argon2 from "argon2";
import { z } from "zod";
import { pool } from "@/lib/db";
import { getAuthenticatedUser, hasRole } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PostgreSQL BIGINT ids are serialised as strings by node-postgres, so the
// UI sends ids back as e.g. "6". Accept numeric strings as well as numbers.
const idSchema = z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER);

const createUserSchema = z.object({
  username: z.string().trim().min(3).max(100),
  email: z.string().trim().email().max(255),
  password: z.string().min(10).max(256),
  role: z.enum(["Admin", "Researcher", "Lab Technician"]),
  researcher_id: idSchema.nullable().optional(),
});

async function authorize(request: NextRequest) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return {
      user: null,
      response: NextResponse.json(
        { success: false, message: "Authentication required." },
        { status: 401 }
      ),
    };
  }

  if (!hasRole(user, ["Admin"])) {
    return {
      user: null,
      response: NextResponse.json(
        { success: false, message: "Administrator access required." },
        { status: 403 }
      ),
    };
  }

  return { user, response: null };
}

export async function GET(request: NextRequest) {
  const auth = await authorize(request);
  if (auth.response) return auth.response;

  try {
    const result = await pool.query(`
      SELECT
        u.user_id,
        u.username,
        u.email,
        u.researcher_id,
        u.is_active,
        u.approval_status,
        u.approved_at,
        u.created_at,
        r.role_name
      FROM public.app_user u
      JOIN public.role r ON r.role_id = u.role_id
      ORDER BY (u.approval_status = 'pending') DESC, u.user_id
      LIMIT 200
    `);

    return NextResponse.json({
      success: true,
      users: result.rows,
    });
  } catch (error) {
    console.error("Failed to fetch users:", error);

    return NextResponse.json(
      { success: false, message: "Could not fetch users." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await authorize(request);
  if (auth.response) return auth.response;

  try {
    const body: unknown = await request.json();
    const parsed = createUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid user details.",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const {
      username,
      email,
      password,
      role,
      researcher_id,
    } = parsed.data;

    if (
      role !== "Researcher" &&
      researcher_id !== undefined &&
      researcher_id !== null
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Only Researcher accounts can be linked to a researcher record.",
        },
        { status: 400 }
      );
    }

    if (researcher_id !== undefined && researcher_id !== null) {
      const researcher = await pool.query(
        `SELECT researcher_id
         FROM public.researcher
         WHERE researcher_id = $1`,
        [researcher_id]
      );

      if (researcher.rowCount === 0) {
        return NextResponse.json(
          { success: false, message: "Researcher record not found." },
          { status: 400 }
        );
      }
    }

    const roleResult = await pool.query(
      `SELECT role_id
       FROM public.role
       WHERE role_name = $1`,
      [role]
    );

    if (roleResult.rowCount === 0) {
      return NextResponse.json(
        { success: false, message: "Selected role does not exist." },
        { status: 400 }
      );
    }

    const passwordHash = await argon2.hash(password);

    const result = await pool.query(
      `INSERT INTO public.app_user
        (username, email, password_hash, role_id, researcher_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING
         user_id,
         username,
         email,
         researcher_id,
         is_active,
         approval_status,
         created_at`,
      [
        username,
        email.toLowerCase(),
        passwordHash,
        roleResult.rows[0].role_id,
        researcher_id ?? null,
      ]
    );

    return NextResponse.json(
      {
        success: true,
        message: "User account created successfully.",
        user: {
          ...result.rows[0],
          role_name: role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create user:", error);

    const dbError = error as { code?: string };

    if (dbError.code === "23505") {
      return NextResponse.json(
        {
          success: false,
          message: "That username or email is already registered.",
        },
        { status: 409 }
      );
    }

    if (dbError.code === "23503") {
      return NextResponse.json(
        {
          success: false,
          message: "The selected researcher record is invalid.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Could not create user account." },
      { status: 500 }
    );
  }
}

async function readJson(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

const updateUserSchema = z.object({
  user_id: idSchema,
  username: z.string().trim().min(3).max(100),
  email: z.string().trim().email().max(255),
  password: z.string().min(10).max(256).optional(),
  role: z.enum(["Admin", "Researcher", "Lab Technician"]),
  researcher_id: idSchema.nullable().optional(),
});

// Edit an existing account's details, role or password.
export async function PUT(request: NextRequest) {
  const auth = await authorize(request);
  if (auth.response) return auth.response;

  const parsed = updateUserSchema.safeParse(await readJson(request));

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid user details.",
        errors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const { user_id, username, email, password, role, researcher_id } =
    parsed.data;

  if (user_id === auth.user.userId && role !== "Admin") {
    return NextResponse.json(
      { success: false, message: "You cannot remove your own Admin role." },
      { status: 400 }
    );
  }

  if (role !== "Researcher" && researcher_id != null) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Only Researcher accounts can be linked to a researcher record.",
      },
      { status: 400 }
    );
  }

  try {
    const passwordHash = password ? await argon2.hash(password) : null;

    const result = await pool.query(
      `UPDATE public.app_user u
       SET username = $2,
           email = $3,
           role_id = r.role_id,
           researcher_id = $5,
           password_hash = COALESCE($6, u.password_hash)
       FROM public.role r
       WHERE u.user_id = $1
         AND r.role_name = $4
       RETURNING u.user_id`,
      [
        user_id,
        username,
        email.toLowerCase(),
        role,
        researcher_id ?? null,
        passwordHash,
      ]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, message: "User account not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "User account updated successfully.",
    });
  } catch (error) {
    const code = (error as { code?: string }).code;

    if (code === "23505") {
      return NextResponse.json(
        {
          success: false,
          message: "That username or email is already registered.",
        },
        { status: 409 }
      );
    }

    if (code === "23503") {
      return NextResponse.json(
        {
          success: false,
          message: "The selected researcher record is invalid.",
        },
        { status: 400 }
      );
    }

    console.error("Failed to update user:", error);

    return NextResponse.json(
      { success: false, message: "Could not update user account." },
      { status: 500 }
    );
  }
}

const patchUserSchema = z.discriminatedUnion("action", [
  // Approve a pending registration, optionally changing the requested role.
  z.object({
    action: z.literal("approve"),
    user_id: idSchema,
    role: z.enum(["Researcher", "Lab Technician"]).optional(),
  }),
  z.object({
    action: z.literal("reject"),
    user_id: idSchema,
  }),
  // Activate or deactivate an already-approved account.
  z.object({
    action: z.literal("set-active"),
    user_id: idSchema,
    is_active: z.boolean(),
  }),
]);

// Approve / reject registrations and activate / deactivate accounts.
export async function PATCH(request: NextRequest) {
  const auth = await authorize(request);
  if (auth.response) return auth.response;

  let body = await readJson(request);

  // Accept the older { user_id, is_active } shape without an action.
  if (
    typeof body === "object" &&
    body !== null &&
    !("action" in body) &&
    "is_active" in body
  ) {
    body = { ...body, action: "set-active" };
  }

  const parsed = patchUserSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "Invalid request." },
      { status: 400 }
    );
  }

  const input = parsed.data;
  const adminId = auth.user.userId;

  if (input.user_id === adminId) {
    return NextResponse.json(
      {
        success: false,
        message: "You cannot change the status of your own account.",
      },
      { status: 400 }
    );
  }

  try {
    let result;
    let message = "";
    let auditDetails: string;

    if (input.action === "approve") {
      result = await pool.query(
        `WITH updated AS (
           UPDATE public.app_user u
           SET approval_status = 'approved',
               is_active = TRUE,
               approved_by = $2,
               approved_at = CURRENT_TIMESTAMP,
               role_id = COALESCE(
                 (SELECT role_id FROM public.role WHERE role_name = $3),
                 u.role_id
               )
           WHERE u.user_id = $1
             AND u.approval_status = 'pending'
           RETURNING u.username, u.role_id
         )
         SELECT updated.username, r.role_name
         FROM updated
         JOIN public.role r ON r.role_id = updated.role_id`,
        [input.user_id, adminId, input.role ?? null]
      );

      const row = result.rows[0];
      if (row) message = `${row.username} approved as ${row.role_name}.`;
      auditDetails = `Approved registration as ${row?.role_name}`;
    } else if (input.action === "reject") {
      result = await pool.query(
        `UPDATE public.app_user
         SET approval_status = 'rejected',
             is_active = FALSE,
             approved_by = $2,
             approved_at = CURRENT_TIMESTAMP
         WHERE user_id = $1
           AND approval_status = 'pending'
         RETURNING username`,
        [input.user_id, adminId]
      );

      const row = result.rows[0];
      if (row) message = `Registration for ${row.username} rejected.`;
      auditDetails = "Rejected registration";
    } else {
      result = await pool.query(
        `UPDATE public.app_user
         SET is_active = $2
         WHERE user_id = $1
           AND approval_status = 'approved'
         RETURNING username`,
        [input.user_id, input.is_active]
      );

      const row = result.rows[0];
      if (row) {
        message = `${row.username} ${input.is_active ? "activated" : "deactivated"}.`;
      }
      auditDetails = input.is_active
        ? "Account activated"
        : "Account deactivated";
    }

    if (result.rowCount === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            input.action === "set-active"
              ? "Only approved accounts can be activated or deactivated."
              : "No pending registration found for that user.",
        },
        { status: 409 }
      );
    }

    await pool
      .query(
        `INSERT INTO public.audit_log
           (user_id, action, table_name, record_id, details)
         VALUES ($1, $2, 'app_user', $3, $4)`,
        [adminId, input.action.toUpperCase(), input.user_id, auditDetails]
      )
      .catch((error) => console.error("Audit log write failed:", error));

    return NextResponse.json({ success: true, message });
  } catch (error) {
    console.error("Failed to update user status:", error);

    return NextResponse.json(
      { success: false, message: "Could not update account status." },
      { status: 500 }
    );
  }
}
