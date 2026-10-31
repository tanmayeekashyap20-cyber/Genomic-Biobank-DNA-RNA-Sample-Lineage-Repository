
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Validate date format
const dateSchema = z.string().regex(
  /^\d{4}-\d{2}-\d{2}$/,
  "Date must use YYYY-MM-DD format."
);

// GET: Fetch sequencing results
export async function GET() {
  try {
    const result = await pool.query(`
      SELECT
        sr.sequencing_result_id,
        sr.sample_id,
        sr.experiment_id,
        sr.sequencing_platform,
        sr.run_date,
        sr.file_path,
        sr.result_status,
        sr.notes,
        e.experiment_name,
        s.status AS sample_status
      FROM public.sequencing_result sr
      JOIN public.sample s
        ON sr.sample_id = s.sample_id
      LEFT JOIN public.experiment e
        ON sr.experiment_id = e.experiment_id
      ORDER BY sr.sequencing_result_id
      LIMIT 100
    `);

    return NextResponse.json({
      success: true,
      count: result.rowCount ?? result.rows.length,
      sequencing_results: result.rows,
    });
  } catch (error) {
    console.error("Failed to fetch sequencing results:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Could not fetch sequencing results.",
      },
      { status: 500 }
    );
  }
}

// Validate creation data
const createSequencingResultSchema = z.object({
  sample_id: z.number().int().positive(),
  experiment_id: z.number().int().positive().nullable().optional(),
  sequencing_platform: z.string().trim().max(100).nullable().optional(),
  run_date: dateSchema.nullable().optional(),
  file_path: z.string().nullable().optional(),
  result_status: z.string().trim().min(1).max(30).optional(),
  notes: z.string().nullable().optional(),
});

// POST: Create a sequencing result
export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const parsed = createSequencingResultSchema.safeParse(body);

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
      sample_id,
      experiment_id,
      sequencing_platform,
      run_date,
      file_path,
      result_status,
      notes,
    } = parsed.data;

    const result = await pool.query(
      `INSERT INTO public.sequencing_result
        (
          sample_id,
          experiment_id,
          sequencing_platform,
          run_date,
          file_path,
          result_status,
          notes
        )
       VALUES ($1, $2, $3, $4::date, $5, $6, $7)
       RETURNING *`,
      [
        sample_id,
        experiment_id ?? null,
        sequencing_platform ?? null,
        run_date ?? null,
        file_path ?? null,
        result_status ?? "pending",
        notes ?? null,
      ]
    );

    return NextResponse.json(
      {
        success: true,
        message: "Sequencing result created successfully.",
        sequencing_result: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create sequencing result:", error);

    const dbError = error as { code?: string };

    if (dbError.code === "23503") {
      return NextResponse.json(
        {
          success: false,
          message: "The specified sample or experiment does not exist.",
        },
        { status: 400 }
      );
    }

    if (dbError.code === "22007" || dbError.code === "22008") {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid run_date value.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Could not create sequencing result.",
      },
      { status: 500 }
    );
  }
}

// Validate update data
const updateSequencingResultSchema = z.object({
  sample_id: z.number().int().positive().optional(),
  experiment_id: z.number().int().positive().nullable().optional(),
  sequencing_platform: z.string().trim().max(100).nullable().optional(),
  run_date: dateSchema.nullable().optional(),
  file_path: z.string().nullable().optional(),
  result_status: z.string().trim().min(1).max(30).optional(),
  notes: z.string().nullable().optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be provided." }
);

// PATCH: Update a sequencing result using ?id=1
export async function PATCH(request: NextRequest) {
  try {
    const resultId = Number(
      new URL(request.url).searchParams.get("id")
    );

    if (!Number.isInteger(resultId) || resultId <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "A valid sequencing result ID is required.",
        },
        { status: 400 }
      );
    }

    const body: unknown = await request.json();
    const parsed = updateSequencingResultSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid sequencing result update data.",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const {
      sample_id,
      experiment_id,
      sequencing_platform,
      run_date,
      file_path,
      result_status,
      notes,
    } = parsed.data;

    const result = await pool.query(
      `UPDATE public.sequencing_result
       SET
         sample_id = COALESCE($1, sample_id),
         experiment_id = CASE WHEN $2 THEN $3 ELSE experiment_id END,
         sequencing_platform = CASE WHEN $4 THEN $5 ELSE sequencing_platform END,
         run_date = CASE WHEN $6 THEN $7::date ELSE run_date END,
         file_path = CASE WHEN $8 THEN $9 ELSE file_path END,
         result_status = COALESCE($10, result_status),
         notes = CASE WHEN $11 THEN $12 ELSE notes END
       WHERE sequencing_result_id = $13
       RETURNING *`,
      [
        sample_id ?? null,
        experiment_id !== undefined,
        experiment_id ?? null,
        sequencing_platform !== undefined,
        sequencing_platform ?? null,
        run_date !== undefined,
        run_date ?? null,
        file_path !== undefined,
        file_path ?? null,
        result_status ?? null,
        notes !== undefined,
        notes ?? null,
        resultId,
      ]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Sequencing result not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Sequencing result updated successfully.",
      sequencing_result: result.rows[0],
    });
  } catch (error) {
    console.error("Failed to update sequencing result:", error);

    const dbError = error as { code?: string };

    if (dbError.code === "23503") {
      return NextResponse.json(
        {
          success: false,
          message: "The specified sample or experiment does not exist.",
        },
        { status: 400 }
      );
    }

    if (dbError.code === "22007" || dbError.code === "22008") {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid run_date value.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Could not update sequencing result.",
      },
      { status: 500 }
    );
  }
}

// DELETE: Remove a sequencing result using ?id=1
export async function DELETE(request: NextRequest) {
  try {
    const resultId = Number(
      new URL(request.url).searchParams.get("id")
    );

    if (!Number.isInteger(resultId) || resultId <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "A valid sequencing result ID is required.",
        },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `DELETE FROM public.sequencing_result
       WHERE sequencing_result_id = $1
       RETURNING sequencing_result_id`,
      [resultId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Sequencing result not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Sequencing result deleted successfully.",
      sequencing_result_id: result.rows[0].sequencing_result_id,
    });
  } catch (error) {
    console.error("Failed to delete sequencing result:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Could not delete sequencing result.",
      },
      { status: 500 }
    );
  }
}
