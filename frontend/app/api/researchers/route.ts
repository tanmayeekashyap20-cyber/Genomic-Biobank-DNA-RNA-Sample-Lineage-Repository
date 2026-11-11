
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import {
  getAuthenticatedUser,
  hasRole,
  type AllowedRole,
} from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Central authorization check
async function authorize(
  request: NextRequest,
  allowedRoles: AllowedRole[]
) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return NextResponse.json(
      { success: false, message: "Authentication required." },
      { status: 401 }
    );
  }

  if (!hasRole(user, allowedRoles)) {
    return NextResponse.json(
      {
        success: false,
        message: "You do not have permission for this action.",
      },
      { status: 403 }
    );
  }

  return null;
}

// Fetch researchers
export async function GET(request: NextRequest) {
  const denied = await authorize(request, ["Admin", "Researcher"]);
  if (denied) return denied;

  try {
    const result = await pool.query(`
      SELECT
        researcher_id,
        full_name,
        department,
        role,
        email,
        phone
      FROM public.researcher
      ORDER BY researcher_id
      LIMIT 100
    `);

    return NextResponse.json({
      success: true,
      count: result.rowCount ?? result.rows.length,
      researchers: result.rows,
    });
  } catch (error) {
    console.error("Failed to fetch researchers:", error);

    return NextResponse.json(
      { success: false, message: "Could not fetch researchers." },
      { status: 500 }
    );
  }
}

// Validate researcher creation data
const createResearcherSchema = z.object({
  full_name: z.string().trim().min(1).max(150),
  department: z.string().trim().max(100).nullable().optional(),
  role: z.string().trim().max(100).nullable().optional(),
  email: z.string().trim().email().max(255).nullable().optional(),
  phone: z.string().trim().max(20).nullable().optional(),
});

// Create a researcher - Admin only
export async function POST(request: NextRequest) {
  const denied = await authorize(request, ["Admin"]);
  if (denied) return denied;

  try {
    const body: unknown = await request.json();
    const parsed = createResearcherSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { full_name, department, role, email, phone } = parsed.data;

    const result = await pool.query(
      `INSERT INTO public.researcher
        (full_name, department, role, email, phone)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        full_name,
        department ?? null,
        role ?? null,
        email ?? null,
        phone ?? null,
      ]
    );

    return NextResponse.json(
      {
        success: true,
        message: "Researcher created successfully.",
        researcher: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create researcher:", error);

    const dbError = error as { code?: string };

    if (dbError.code === "23505") {
      return NextResponse.json(
        {
          success: false,
          message: "A researcher with this unique information already exists.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Could not create researcher." },
      { status: 500 }
    );
  }
}

// Validate researcher update data
const updateResearcherSchema = z.object({
  full_name: z.string().trim().min(1).max(150).optional(),
  department: z.string().trim().max(100).nullable().optional(),
  role: z.string().trim().max(100).nullable().optional(),
  email: z.string().trim().email().max(255).nullable().optional(),
  phone: z.string().trim().max(20).nullable().optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be provided." }
);

// Update researcher - Admin only
export async function PATCH(request: NextRequest) {
  const denied = await authorize(request, ["Admin"]);
  if (denied) return denied;

  try {
    const researcherId = Number(
      new URL(request.url).searchParams.get("id")
    );

    if (!Number.isInteger(researcherId) || researcherId <= 0) {
      return NextResponse.json(
        { success: false, message: "A valid researcher ID is required." },
        { status: 400 }
      );
    }

    const body: unknown = await request.json();
    const parsed = updateResearcherSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid researcher update data.",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const {
      full_name,
      department,
      role,
      email,
      phone,
    } = parsed.data;

    const result = await pool.query(
      `UPDATE public.researcher
       SET
         full_name = COALESCE($1, full_name),
         department = CASE WHEN $2 THEN $3 ELSE department END,
         role = CASE WHEN $4 THEN $5 ELSE role END,
         email = CASE WHEN $6 THEN $7 ELSE email END,
         phone = CASE WHEN $8 THEN $9 ELSE phone END
       WHERE researcher_id = $10
       RETURNING *`,
      [
        full_name ?? null,
        department !== undefined,
        department ?? null,
        role !== undefined,
        role ?? null,
        email !== undefined,
        email ?? null,
        phone !== undefined,
        phone ?? null,
        researcherId,
      ]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, message: "Researcher not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Researcher updated successfully.",
      researcher: result.rows[0],
    });
  } catch (error) {
    console.error("Failed to update researcher:", error);

    const dbError = error as { code?: string };

    if (dbError.code === "23505") {
      return NextResponse.json(
        {
          success: false,
          message: "A researcher with this unique information already exists.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Could not update researcher." },
      { status: 500 }
    );
  }
}

// Delete researcher - Admin only
export async function DELETE(request: NextRequest) {
  const denied = await authorize(request, ["Admin"]);
  if (denied) return denied;

  try {
    const researcherId = Number(
      new URL(request.url).searchParams.get("id")
    );

    if (!Number.isInteger(researcherId) || researcherId <= 0) {
      return NextResponse.json(
        { success: false, message: "A valid researcher ID is required." },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `DELETE FROM public.researcher
       WHERE researcher_id = $1
       RETURNING researcher_id`,
      [researcherId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, message: "Researcher not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Researcher deleted successfully.",
      researcher_id: result.rows[0].researcher_id,
    });
  } catch (error) {
    console.error("Failed to delete researcher:", error);

    const dbError = error as { code?: string };

    if (dbError.code === "23503") {
      return NextResponse.json(
        {
          success: false,
          message: "This researcher is referenced by other records and cannot be deleted.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Could not delete researcher." },
      { status: 500 }
    );
  }
}
