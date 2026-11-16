
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

async function authorize(
  request: NextRequest,
  allowedRoles: AllowedRole[],
) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return NextResponse.json(
      { success: false, message: "Authentication required." },
      { status: 401 },
    );
  }

  if (!hasRole(user, allowedRoles)) {
    return NextResponse.json(
      { success: false, message: "You do not have permission." },
      { status: 403 },
    );
  }

  return null;
}

const processingSchema = z.object({
  process_type: z.string().trim().min(1).max(100),
  process_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  performed_by: z.number().int().positive(),
  description: z.string().trim().nullable().optional(),
  input_sample_id: z.number().int().positive(),
  output_sample_id: z.number().int().positive(),
  quantity: z.number().min(0).max(999999999.999).nullable().optional(),
  unit: z.string().trim().max(30).nullable().optional(),
}).refine(
  (data) => data.input_sample_id !== data.output_sample_id,
  {
    message: "Input and output samples must be different.",
    path: ["output_sample_id"],
  },
);

export async function POST(request: NextRequest) {
  const denied = await authorize(request, ["Admin", "Researcher", "Lab Technician"]);
  if (denied) return denied;

  let client;

  try {
    const body: unknown = await request.json();
    const parsed = processingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid processing information.",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const values = parsed.data;

    client = await pool.connect();

    await client.query("BEGIN");

    const processResult = await client.query(
      `INSERT INTO public.process
        (process_type, process_date, performed_by, description)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        values.process_type,
        values.process_date,
        values.performed_by,
        values.description ?? null,
      ],
    );

    const process = processResult.rows[0];

    const sampleProcessResult = await client.query(
      `INSERT INTO public.sample_process
        (process_id, input_sample_id, output_sample_id, quantity, unit)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        process.process_id,
        values.input_sample_id,
        values.output_sample_id,
        values.quantity ?? null,
        values.unit ?? null,
      ],
    );

    await client.query("COMMIT");

    return NextResponse.json(
      {
        success: true,
        message: "Processing event created successfully.",
        process,
        sample_process: sampleProcessResult.rows[0],
      },
      { status: 201 },
    );
  } catch (error) {
    if (client) {
      await client.query("ROLLBACK").catch(() => undefined);
    }

    console.error("Failed to create processing event:", error);

    const dbError = error as { code?: string };

    if (dbError.code === "23503") {
      return NextResponse.json(
        {
          success: false,
          message: "The specified researcher or sample does not exist.",
        },
        { status: 400 },
      );
    }

    if (dbError.code === "23514") {
      return NextResponse.json(
        {
          success: false,
          message: "Input and output samples must differ, and quantity cannot be negative.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { success: false, message: "Could not create processing event." },
      { status: 500 },
    );
  } finally {
    client?.release();
  }
}
