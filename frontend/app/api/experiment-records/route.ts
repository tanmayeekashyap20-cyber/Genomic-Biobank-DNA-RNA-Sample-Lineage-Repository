import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { getAuthenticatedUser, hasRole } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const experimentSchema = z.object({
  experiment_name: z.string().trim().min(1).max(150),
  experiment_type: z.string().trim().min(1).max(100),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  researcher_id: z.number().int().positive(),
  status: z.enum(["planned", "in_progress", "completed", "on_hold"]),
  description: z.string().trim().max(2000).nullable().optional(),
  sample_id: z.number().int().positive(),
  date_added: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().trim().max(2000).nullable().optional(),
}).refine(
  (data) => !data.end_date || data.end_date >= data.start_date,
  {
    message: "End date cannot be earlier than start date.",
    path: ["end_date"],
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

  const parsed = experimentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid experiment data.",
        errors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const {
    experiment_name,
    experiment_type,
    start_date,
    end_date,
    researcher_id,
    status,
    description,
    sample_id,
    date_added,
    notes,
  } = parsed.data;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const experimentResult = await client.query(
      `INSERT INTO public.experiment
        (
          experiment_name,
          experiment_type,
          start_date,
          end_date,
          researcher_id,
          status,
          description
        )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        experiment_name,
        experiment_type,
        start_date,
        end_date ?? null,
        researcher_id,
        status,
        description ?? null,
      ]
    );

    const experiment = experimentResult.rows[0];

    const associationResult = await client.query(
      `INSERT INTO public.experiment_sample
        (experiment_id, sample_id, date_added, notes)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        experiment.experiment_id,
        sample_id,
        date_added,
        notes ?? null,
      ]
    );

    await client.query("COMMIT");

    return NextResponse.json(
      {
        success: true,
        message: "Experiment and sample association created successfully.",
        experiment,
        experiment_sample: associationResult.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Failed to create experiment:", error);

    const dbError = error as { code?: string };

    if (dbError.code === "23503") {
      return NextResponse.json(
        {
          success: false,
          message: "The specified researcher or sample does not exist.",
        },
        { status: 400 }
      );
    }

    if (dbError.code === "23514") {
      return NextResponse.json(
        {
          success: false,
          message: "The experiment data violates a database constraint.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Could not create the experiment." },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
