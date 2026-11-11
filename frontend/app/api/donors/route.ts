
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

// Fetch all donors
export async function GET(request: NextRequest) {
  const denied = await authorize(request, ["Admin", "Researcher"]);
  if (denied) return denied;

  try {
    const result = await pool.query(`
      SELECT
        donor_id,
        full_name,
        date_of_birth,
        gender,
        phone_number,
        email,
        address,
        registration_date
      FROM public.donor
      ORDER BY donor_id
      LIMIT 100
    `);

    return NextResponse.json({
      success: true,
      count: result.rowCount ?? result.rows.length,
      donors: result.rows,
    });
  } catch (error) {
    console.error("Failed to fetch donors:", error);

    return NextResponse.json(
      { success: false, message: "Could not fetch donors." },
      { status: 500 }
    );
  }
}

// Validate donor creation data
const createDonorSchema = z.object({
  full_name: z.string().trim().min(1).max(150),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  gender: z.string().trim().max(30).nullable().optional(),
  phone_number: z.string().trim().max(20).nullable().optional(),
  email: z.string().trim().email().max(255).nullable().optional(),
  address: z.string().nullable().optional(),
});

// Create a donor
export async function POST(request: NextRequest) {
  const denied = await authorize(request, ["Admin", "Researcher"]);
  if (denied) return denied;

  try {
    const body: unknown = await request.json();
    const parsed = createDonorSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const {
      full_name,
      date_of_birth,
      gender,
      phone_number,
      email,
      address,
    } = parsed.data;

    const result = await pool.query(
      `INSERT INTO public.donor
        (full_name, date_of_birth, gender, phone_number, email, address)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        full_name,
        date_of_birth ?? null,
        gender ?? null,
        phone_number ?? null,
        email ?? null,
        address ?? null,
      ]
    );

    return NextResponse.json(
      {
        success: true,
        message: "Donor created successfully.",
        donor: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create donor:", error);

    const dbError = error as { code?: string };

    if (dbError.code === "23505") {
      return NextResponse.json(
        {
          success: false,
          message: "A donor with this unique information already exists.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Could not create donor." },
      { status: 500 }
    );
  }
}

// Validate donor update data
const updateDonorSchema = z
  .object({
    full_name: z.string().trim().min(1).max(150).optional(),
    date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    gender: z.string().trim().max(30).nullable().optional(),
    phone_number: z.string().trim().max(20).nullable().optional(),
    email: z.string().trim().email().max(255).nullable().optional(),
    address: z.string().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided.",
  });

// Update a donor using /api/donors?id=1
export async function PATCH(request: NextRequest) {
  const denied = await authorize(request, ["Admin", "Researcher"]);
  if (denied) return denied;

  try {
    const donorId = Number(new URL(request.url).searchParams.get("id"));

    if (!Number.isInteger(donorId) || donorId <= 0) {
      return NextResponse.json(
        { success: false, message: "A valid donor ID is required." },
        { status: 400 }
      );
    }

    const body: unknown = await request.json();
    const parsed = updateDonorSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid donor update data.",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const {
      full_name,
      date_of_birth,
      gender,
      phone_number,
      email,
      address,
    } = parsed.data;

    const result = await pool.query(
      `UPDATE public.donor
       SET
         full_name = COALESCE($1, full_name),
         date_of_birth = CASE WHEN $2 THEN $3::date ELSE date_of_birth END,
         gender = CASE WHEN $4 THEN $5 ELSE gender END,
         phone_number = CASE WHEN $6 THEN $7 ELSE phone_number END,
         email = CASE WHEN $8 THEN $9 ELSE email END,
         address = CASE WHEN $10 THEN $11 ELSE address END
       WHERE donor_id = $12
       RETURNING *`,
      [
        full_name ?? null,
        date_of_birth !== undefined,
        date_of_birth ?? null,
        gender !== undefined,
        gender ?? null,
        phone_number !== undefined,
        phone_number ?? null,
        email !== undefined,
        email ?? null,
        address !== undefined,
        address ?? null,
        donorId,
      ]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, message: "Donor not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Donor updated successfully.",
      donor: result.rows[0],
    });
  } catch (error) {
    console.error("Failed to update donor:", error);

    const dbError = error as { code?: string };

    if (dbError.code === "23505") {
      return NextResponse.json(
        {
          success: false,
          message: "A donor with this unique information already exists.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Could not update donor." },
      { status: 500 }
    );
  }
}

// Delete a donor using /api/donors?id=1
export async function DELETE(request: NextRequest) {
  const denied = await authorize(request, ["Admin"]);
  if (denied) return denied;

  try {
    const donorId = Number(new URL(request.url).searchParams.get("id"));

    if (!Number.isInteger(donorId) || donorId <= 0) {
      return NextResponse.json(
        { success: false, message: "A valid donor ID is required." },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `DELETE FROM public.donor
       WHERE donor_id = $1
       RETURNING donor_id`,
      [donorId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, message: "Donor not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Donor deleted successfully.",
      donor_id: result.rows[0].donor_id,
    });
  } catch (error) {
    console.error("Failed to delete donor:", error);

    const dbError = error as { code?: string };

    if (dbError.code === "23503") {
      return NextResponse.json(
        {
          success: false,
          message: "This donor is referenced by other records and cannot be deleted.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Could not delete donor." },
      { status: 500 }
    );
  }
}
