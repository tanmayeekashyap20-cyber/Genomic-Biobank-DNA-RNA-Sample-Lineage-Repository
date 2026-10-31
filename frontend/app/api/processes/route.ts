
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Fetch processes with researcher details
export async function GET() {
  try {
    const result = await pool.query(`
      SELECT
        p.process_id,
        p.process_type,
        p.process_date,
        p.performed_by,
        r.full_name AS researcher_name,
        p.description
      FROM public.process p
      JOIN public.researcher r
        ON p.performed_by = r.researcher_id
      ORDER BY p.process_id
      LIMIT 100
    `);

    return NextResponse.json({
      success: true,
      count: result.rowCount ?? result.rows.length,
      processes: result.rows,
    });
  } catch (error) {
    console.error("Failed to fetch processes:", error);

    return NextResponse.json(
      { success: false, message: "Could not fetch processes." },
      { status: 500 }
    );
  }
}

// Validate process creation data
const createProcessSchema = z.object({
  process_type: z.string().trim().min(1).max(100),
  process_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  performed_by: z.number().int().positive(),
  description: z.string().trim().nullable().optional(),
});

// Create a process
export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const parsed = createProcessSchema.safeParse(body);

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
      process_type,
      process_date,
      performed_by,
      description,
    } = parsed.data;

    const result = await pool.query(
      `INSERT INTO public.process
        (process_type, process_date, performed_by, description)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        process_type,
        process_date,
        performed_by,
        description ?? null,
      ]
    );

    return NextResponse.json(
      {
        success: true,
        message: "Process created successfully.",
        process: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create process:", error);

    const dbError = error as { code?: string };

    if (dbError.code === "23503") {
      return NextResponse.json(
        { success: false, message: "The specified researcher does not exist." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Could not create process." },
      { status: 500 }
    );
  }
}

// Validate process update data
const updateProcessSchema = z.object({
  process_type: z.string().trim().min(1).max(100).optional(),
  process_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  performed_by: z.number().int().positive().optional(),
  description: z.string().trim().nullable().optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be provided." }
);

// Update process using /api/processes?id=1
export async function PATCH(request: NextRequest) {
  try {
    const processId = Number(
      new URL(request.url).searchParams.get("id")
    );

    if (!Number.isInteger(processId) || processId <= 0) {
      return NextResponse.json(
        { success: false, message: "A valid process ID is required." },
        { status: 400 }
      );
    }

    const body: unknown = await request.json();
    const parsed = updateProcessSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid process update data.",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const {
      process_type,
      process_date,
      performed_by,
      description,
    } = parsed.data;

    const result = await pool.query(
      `UPDATE public.process
       SET
         process_type = COALESCE($1, process_type),
         process_date = COALESCE($2, process_date),
         performed_by = COALESCE($3, performed_by),
         description = CASE WHEN $4 THEN $5 ELSE description END
       WHERE process_id = $6
       RETURNING *`,
      [
        process_type ?? null,
        process_date ?? null,
        performed_by ?? null,
        description !== undefined,
        description ?? null,
        processId,
      ]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, message: "Process not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Process updated successfully.",
      process: result.rows[0],
    });
  } catch (error) {
    console.error("Failed to update process:", error);

    const dbError = error as { code?: string };

    if (dbError.code === "23503") {
      return NextResponse.json(
        { success: false, message: "The specified researcher does not exist." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Could not update process." },
      { status: 500 }
    );
  }
}

// Delete process using /api/processes?id=1
export async function DELETE(request: NextRequest) {
  try {
    const processId = Number(
      new URL(request.url).searchParams.get("id")
    );

    if (!Number.isInteger(processId) || processId <= 0) {
      return NextResponse.json(
        { success: false, message: "A valid process ID is required." },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `DELETE FROM public.process
       WHERE process_id = $1
       RETURNING process_id`,
      [processId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, message: "Process not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Process deleted successfully.",
      process_id: result.rows[0].process_id,
    });
  } catch (error) {
    console.error("Failed to delete process:", error);

    const dbError = error as { code?: string };

    if (dbError.code === "23503") {
      return NextResponse.json(
        {
          success: false,
          message: "This process is referenced by sample process records and cannot be deleted.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Could not delete process." },
      { status: 500 }
    );
  }
}
