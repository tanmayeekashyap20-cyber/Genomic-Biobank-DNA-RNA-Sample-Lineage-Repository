
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { authorizeRequest, experimentScope } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createExperimentRecordSchema = z.object({
  experiment_name: z.string().trim().min(1).max(150),
  experiment_type: z.string().trim().max(100).nullable().optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  researcher_id: z.number().int().positive(),
  status: z.string().trim().min(1).max(30).optional(),
  description: z.string().nullable().optional(),
  sample_id: z.number().int().positive(),
  date_added: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().nullable().optional(),
}).refine(
  (data) =>
    !data.start_date ||
    !data.end_date ||
    data.end_date >= data.start_date,
  {
    message: "End date cannot be earlier than start date.",
    path: ["end_date"],
  },
);

export async function POST(request: NextRequest) {
  const auth = await authorizeRequest(request, ["Admin", "Researcher", "Lab Technician"]);
  if (auth.response) return auth.response;

  // Researchers can only create experiments assigned to themselves.
  const scope = experimentScope(auth.user);
  if (scope === 0) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Your account is not linked to a researcher record. Ask an administrator to link it.",
      },
      { status: 403 },
    );
  }

  let client;

  try {
    const body: unknown = await request.json();
    const parsed = createExperimentRecordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid experiment data.",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
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

    client = await pool.connect();

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
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'planned'), $7)
       RETURNING *`,
      [
        experiment_name,
        experiment_type ?? null,
        start_date ?? null,
        end_date ?? null,
        scope ?? researcher_id,
        status ?? null,
        description ?? null,
      ],
    );

    const experiment = experimentResult.rows[0];

    const associationResult = await client.query(
      `INSERT INTO public.experiment_sample
        (
          experiment_id,
          sample_id,
          date_added,
          notes
        )
       VALUES ($1, $2, COALESCE($3::date, CURRENT_DATE), $4)
       RETURNING *`,
      [
        experiment.experiment_id,
        sample_id,
        date_added ?? null,
        notes ?? null,
      ],
    );

    await client.query("COMMIT");

    return NextResponse.json(
      {
        success: true,
        message: "Experiment and sample association created successfully.",
        experiment,
        experiment_sample: associationResult.rows[0],
      },
      { status: 201 },
    );
  } catch (error) {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Experiment transaction rollback failed:", rollbackError);
      }
    }

    console.error("Failed to create experiment record:", error);

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

    if (dbError.code === "23505") {
      return NextResponse.json(
        {
          success: false,
          message: "This sample is already associated with this experiment.",
        },
        { status: 409 },
      );
    }

    if (dbError.code === "23514") {
      return NextResponse.json(
        {
          success: false,
          message: "The experiment dates are invalid.",
        },
        { status: 400 },
      );
    }

    if (dbError.code === "22007" || dbError.code === "22008") {
      return NextResponse.json(
        {
          success: false,
          message: "An invalid date was provided.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Could not create the experiment record.",
      },
      { status: 500 },
    );
  } finally {
    client?.release();
  }
}
