import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { getAuthenticatedUser, hasRole } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const processingEventSchema = z.object({
  process_type: z.string().trim().min(1).max(100),
  process_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  performed_by: z.number().int().positive(),
  description: z.string().trim().max(2000).nullable().optional(),
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

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return NextResponse.json(
      { success: false, message: "Authentication required." },
      { status: 401 }
    );
  }

  if (!hasRole(user, ["Admin", "Researcher"])) {
    return NextResponse.json(
      { success: false, message: "You do not have permission to perform this action." },
      { status: 403 }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON request body." },
      { status: 400 }
    );
  }

  const parsed = processingEventSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid processing event data.",
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
    input_sample_id,
    output_sample_id,
    quantity,
    unit,
  } = parsed.data;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const processResult = await client.query(
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

    const process = processResult.rows[0];

    const sampleProcessResult = await client.query(
      `INSERT INTO public.sample_process
        (process_id, input_sample_id, output_sample_id, quantity, unit)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        process.process_id,
        input_sample_id,
        output_sample_id,
        quantity ?? null,
        unit ?? null,
      ]
    );

    await client.query("COMMIT");

    return NextResponse.json(
      {
        success: true,
        message: "Processing event created successfully.",
        process,
        sample_process: sampleProcessResult.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Failed to create processing event:", error);

    const dbError = error as { code?: string };

    if (dbError.code === "23503") {
      return NextResponse.json(
        {
          success: false,
          message: "The specified researcher, process, or sample does not exist.",
        },
        { status: 400 }
      );
    }

    if (dbError.code === "23514") {
      return NextResponse.json(
        {
          success: false,
          message: "The input and output samples must differ, and quantity cannot be negative.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Could not save the processing event." },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
