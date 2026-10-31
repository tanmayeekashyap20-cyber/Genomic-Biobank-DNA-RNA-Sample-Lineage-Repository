
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { getAuthenticatedUser, hasRole, type AllowedRole } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Check authentication and permissions
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
        message: "You do not have permission to perform this action.",
      },
      { status: 403 }
    );
  }

  return null;
}

// Fetch sample process records
export async function GET(request: NextRequest) {
  const denied = await authorize(request, ["Admin", "Researcher"]);
  if (denied) return denied;

  try {
    const result = await pool.query(`
      SELECT
        sp.sample_process_id,
        sp.process_id,
        p.process_type,
        sp.input_sample_id,
        sp.output_sample_id,
        sp.quantity,
        sp.unit
      FROM public.sample_process sp
      JOIN public.process p
        ON sp.process_id = p.process_id
      ORDER BY sp.sample_process_id
      LIMIT 100
    `);

    return NextResponse.json({
      success: true,
      count: result.rowCount ?? result.rows.length,
      sample_processes: result.rows,
    });
  } catch (error) {
    console.error("Failed to fetch sample processes:", error);

    return NextResponse.json(
      { success: false, message: "Could not fetch sample processes." },
      { status: 500 }
    );
  }
}

// Validate sample process creation data
const createSampleProcessSchema = z.object({
  process_id: z.number().int().positive(),
  input_sample_id: z.number().int().positive(),
  output_sample_id: z.number().int().positive(),
  quantity: z.number().min(0).max(999999999.999).nullable().optional(),
  unit: z.string().trim().max(30).nullable().optional(),
}).refine(
  (data) => data.input_sample_id !== data.output_sample_id,
  {
    message: "Input and output samples must be different.",
    path: ["output_sample_id"],
  }
);

// Create a sample process record
export async function POST(request: NextRequest) {
  const denied = await authorize(request, ["Admin", "Researcher"]);
  if (denied) return denied;

  try {
    const body: unknown = await request.json();
    const parsed = createSampleProcessSchema.safeParse(body);

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
      process_id,
      input_sample_id,
      output_sample_id,
      quantity,
      unit,
    } = parsed.data;

    const result = await pool.query(
      `INSERT INTO public.sample_process
        (process_id, input_sample_id, output_sample_id, quantity, unit)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        process_id,
        input_sample_id,
        output_sample_id,
        quantity ?? null,
        unit ?? null,
      ]
    );

    return NextResponse.json(
      {
        success: true,
        message: "Sample process created successfully.",
        sample_process: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create sample process:", error);

    const dbError = error as { code?: string };

    if (dbError.code === "23503") {
      return NextResponse.json(
        {
          success: false,
          message: "The specified process or sample does not exist.",
        },
        { status: 400 }
      );
    }

    if (dbError.code === "23514") {
      return NextResponse.json(
        {
          success: false,
          message: "Input and output samples must differ, and quantity cannot be negative.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Could not create sample process." },
      { status: 500 }
    );
  }
}

// Validate sample process update data
const updateSampleProcessSchema = z.object({
  process_id: z.number().int().positive().optional(),
  input_sample_id: z.number().int().positive().optional(),
  output_sample_id: z.number().int().positive().optional(),
  quantity: z.number().min(0).max(999999999.999).nullable().optional(),
  unit: z.string().trim().max(30).nullable().optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be provided." }
);

// Update a sample process
export async function PATCH(request: NextRequest) {
  const denied = await authorize(request, ["Admin", "Researcher"]);
  if (denied) return denied;

  try {
    const sampleProcessId = Number(
      new URL(request.url).searchParams.get("id")
    );

    if (!Number.isInteger(sampleProcessId) || sampleProcessId <= 0) {
      return NextResponse.json(
        { success: false, message: "A valid sample process ID is required." },
        { status: 400 }
      );
    }

    const body: unknown = await request.json();
    const parsed = updateSampleProcessSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid sample process update data.",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const {
      process_id,
      input_sample_id,
      output_sample_id,
      quantity,
      unit,
    } = parsed.data;

    const result = await pool.query(
      `UPDATE public.sample_process
       SET
         process_id = COALESCE($1, process_id),
         input_sample_id = COALESCE($2, input_sample_id),
         output_sample_id = COALESCE($3, output_sample_id),
         quantity = CASE WHEN $4 THEN $5 ELSE quantity END,
         unit = CASE WHEN $6 THEN $7 ELSE unit END
       WHERE sample_process_id = $8
       RETURNING *`,
      [
        process_id ?? null,
        input_sample_id ?? null,
        output_sample_id ?? null,
        quantity !== undefined,
        quantity ?? null,
        unit !== undefined,
        unit ?? null,
        sampleProcessId,
      ]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, message: "Sample process record not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Sample process updated successfully.",
      sample_process: result.rows[0],
    });
  } catch (error) {
    console.error("Failed to update sample process:", error);

    const dbError = error as { code?: string };

    if (dbError.code === "23503") {
      return NextResponse.json(
        {
          success: false,
          message: "The specified process or sample does not exist.",
        },
        { status: 400 }
      );
    }

    if (dbError.code === "23514") {
      return NextResponse.json(
        {
          success: false,
          message: "Input and output samples must differ, and quantity cannot be negative.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Could not update sample process." },
      { status: 500 }
    );
  }
}

// Delete a sample process
export async function DELETE(request: NextRequest) {
  const denied = await authorize(request, ["Admin"]);
  if (denied) return denied;

  try {
    const sampleProcessId = Number(
      new URL(request.url).searchParams.get("id")
    );

    if (!Number.isInteger(sampleProcessId) || sampleProcessId <= 0) {
      return NextResponse.json(
        { success: false, message: "A valid sample process ID is required." },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `DELETE FROM public.sample_process
       WHERE sample_process_id = $1
       RETURNING sample_process_id`,
      [sampleProcessId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, message: "Sample process record not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Sample process deleted successfully.",
      sample_process_id: result.rows[0].sample_process_id,
    });
  } catch (error) {
    console.error("Failed to delete sample process:", error);

    return NextResponse.json(
      { success: false, message: "Could not delete sample process." },
      { status: 500 }
    );
  }
}
