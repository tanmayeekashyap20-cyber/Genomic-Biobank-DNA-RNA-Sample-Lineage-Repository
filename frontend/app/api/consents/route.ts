
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

// Fetch consent records
export async function GET(request: NextRequest) {
  const denied = await authorize(request, ["Admin", "Researcher"]);
  if (denied) return denied;

  try {
    const result = await pool.query(`
      SELECT
        c.consent_id,
        c.donor_id,
        d.full_name AS donor_name,
        c.consent_type,
        c.consent_date,
        c.expiry_date,
        c.status,
        c.description
      FROM public.consent AS c
      JOIN public.donor AS d
        ON d.donor_id = c.donor_id
      ORDER BY c.consent_id
      LIMIT 100
    `);

    return NextResponse.json({
      success: true,
      count: result.rowCount ?? result.rows.length,
      consents: result.rows,
    });
  } catch (error) {
    console.error("Failed to fetch consents:", error);

    return NextResponse.json(
      { success: false, message: "Could not fetch consent records." },
      { status: 500 }
    );
  }
}

// Validate consent creation data
const createConsentSchema = z.object({
  donor_id: z.number().int().positive(),
  consent_type: z.string().trim().min(1).max(100),
  consent_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  status: z.string().trim().min(1).max(30),
  description: z.string().nullable().optional(),
}).refine(
  (data) =>
    !data.expiry_date || data.expiry_date >= data.consent_date,
  {
    message: "Expiry date cannot be earlier than consent date.",
    path: ["expiry_date"],
  }
);

// Create a consent record
export async function POST(request: NextRequest) {
  const denied = await authorize(request, ["Admin", "Researcher"]);
  if (denied) return denied;

  try {
    const body: unknown = await request.json();
    const parsed = createConsentSchema.safeParse(body);

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
      donor_id,
      consent_type,
      consent_date,
      expiry_date,
      status,
      description,
    } = parsed.data;

    const result = await pool.query(
      `INSERT INTO public.consent
        (donor_id, consent_type, consent_date, expiry_date, status, description)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        donor_id,
        consent_type,
        consent_date,
        expiry_date ?? null,
        status,
        description ?? null,
      ]
    );

    return NextResponse.json(
      {
        success: true,
        message: "Consent record created successfully.",
        consent: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create consent:", error);

    const dbError = error as { code?: string };

    if (dbError.code === "23503") {
      return NextResponse.json(
        { success: false, message: "The specified donor does not exist." },
        { status: 400 }
      );
    }

    if (dbError.code === "23514") {
      return NextResponse.json(
        { success: false, message: "Expiry date cannot be earlier than consent date." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Could not create consent record." },
      { status: 500 }
    );
  }
}

// Validate consent update data
const updateConsentSchema = z.object({
  donor_id: z.number().int().positive().optional(),
  consent_type: z.string().trim().min(1).max(100).optional(),
  consent_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  status: z.string().trim().min(1).max(30).optional(),
  description: z.string().nullable().optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be provided." }
);

// Update a consent record using /api/consents?id=1
export async function PATCH(request: NextRequest) {
  const denied = await authorize(request, ["Admin", "Researcher"]);
  if (denied) return denied;

  try {
    const consentId = Number(new URL(request.url).searchParams.get("id"));

    if (!Number.isInteger(consentId) || consentId <= 0) {
      return NextResponse.json(
        { success: false, message: "A valid consent ID is required." },
        { status: 400 }
      );
    }

    const body: unknown = await request.json();
    const parsed = updateConsentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid consent update data.",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const {
      donor_id,
      consent_type,
      consent_date,
      expiry_date,
      status,
      description,
    } = parsed.data;

    const result = await pool.query(
      `UPDATE public.consent
       SET
         donor_id = COALESCE($1, donor_id),
         consent_type = COALESCE($2, consent_type),
         consent_date = COALESCE($3::date, consent_date),
         expiry_date = CASE WHEN $4 THEN $5::date ELSE expiry_date END,
         status = COALESCE($6, status),
         description = CASE WHEN $7 THEN $8 ELSE description END
       WHERE consent_id = $9
       RETURNING *`,
      [
        donor_id ?? null,
        consent_type ?? null,
        consent_date ?? null,
        expiry_date !== undefined,
        expiry_date ?? null,
        status ?? null,
        description !== undefined,
        description ?? null,
        consentId,
      ]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, message: "Consent record not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Consent record updated successfully.",
      consent: result.rows[0],
    });
  } catch (error) {
    console.error("Failed to update consent:", error);

    const dbError = error as { code?: string };

    if (dbError.code === "23503") {
      return NextResponse.json(
        { success: false, message: "The specified donor does not exist." },
        { status: 400 }
      );
    }

    if (dbError.code === "23514") {
      return NextResponse.json(
        { success: false, message: "Expiry date cannot be earlier than consent date." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Could not update consent record." },
      { status: 500 }
    );
  }
}

// Delete a consent record using /api/consents?id=1
export async function DELETE(request: NextRequest) {
  const denied = await authorize(request, ["Admin"]);
  if (denied) return denied;

  try {
    const consentId = Number(new URL(request.url).searchParams.get("id"));

    if (!Number.isInteger(consentId) || consentId <= 0) {
      return NextResponse.json(
        { success: false, message: "A valid consent ID is required." },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `DELETE FROM public.consent
       WHERE consent_id = $1
       RETURNING consent_id`,
      [consentId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, message: "Consent record not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Consent record deleted successfully.",
      consent_id: result.rows[0].consent_id,
    });
  } catch (error) {
    console.error("Failed to delete consent:", error);

    const dbError = error as { code?: string };

    if (dbError.code === "23503") {
      return NextResponse.json(
        {
          success: false,
          message: "This consent record is referenced by other records and cannot be deleted.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Could not delete consent record." },
      { status: 500 }
    );
  }
}
