
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import {
  authorizeRequest,
  experimentScope,
  getAuthenticatedUser,
  hasRole,
  type AllowedRole,
} from "@/lib/auth";

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

// GET: Fetch experiment-sample associations
export async function GET(request: NextRequest) {
  const auth = await authorizeRequest(request, ["Admin", "Researcher", "Lab Technician"]);
  if (auth.response) return auth.response;

  try {
    const scope = experimentScope(auth.user);
    const result = await pool.query(`
      SELECT
        es.experiment_sample_id,
        es.experiment_id,
        e.experiment_name,
        es.sample_id,
        s.status AS sample_status,
        es.date_added,
        es.notes
      FROM public.experiment_sample es
      JOIN public.experiment e
        ON es.experiment_id = e.experiment_id
      JOIN public.sample s
        ON es.sample_id = s.sample_id
      WHERE ($1::bigint IS NULL OR e.researcher_id = $1)
      ORDER BY es.experiment_sample_id
      LIMIT 100
    `, [scope]);

    return NextResponse.json({
      success: true,
      count: result.rowCount ?? result.rows.length,
      experiment_samples: result.rows,
    });
  } catch (error) {
    console.error("Failed to fetch experiment samples:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Could not fetch experiment samples.",
      },
      { status: 500 }
    );
  }
}

// Validate creation data
const createExperimentSampleSchema = z.object({
  experiment_id: z.number().int().positive(),
  sample_id: z.number().int().positive(),
  date_added: z.string().regex(
    /^\d{4}-\d{2}-\d{2}$/,
    "Date must use YYYY-MM-DD format."
  ).optional(),
  notes: z.string().nullable().optional(),
});

// POST: Add a sample to an experiment
export async function POST(request: NextRequest) {
  const auth = await authorizeRequest(request, ["Admin", "Researcher", "Lab Technician"]);
  if (auth.response) return auth.response;
  const scope = experimentScope(auth.user);

  try {
    const body: unknown = await request.json();
    const parsed = createExperimentSampleSchema.safeParse(body);

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
      experiment_id,
      sample_id,
      date_added,
      notes,
    } = parsed.data;

    // Researchers may only add samples to their own experiments.
    if (scope !== null) {
      const owned = await pool.query(
        "SELECT 1 FROM public.experiment WHERE experiment_id = $1 AND researcher_id = $2",
        [experiment_id, scope]
      );
      if (owned.rowCount === 0) {
        return NextResponse.json(
          { success: false, message: "You can only add samples to your own experiments." },
          { status: 403 }
        );
      }
    }

    const result = await pool.query(
      `INSERT INTO public.experiment_sample
        (experiment_id, sample_id, date_added, notes)
       VALUES ($1, $2, COALESCE($3::date, CURRENT_DATE), $4)
       RETURNING *`,
      [
        experiment_id,
        sample_id,
        date_added ?? null,
        notes ?? null,
      ]
    );

    return NextResponse.json(
      {
        success: true,
        message: "Sample added to experiment successfully.",
        experiment_sample: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to add sample to experiment:", error);

    const dbError = error as { code?: string };

    if (dbError.code === "23503") {
      return NextResponse.json(
        {
          success: false,
          message: "The specified experiment or sample does not exist.",
        },
        { status: 400 }
      );
    }

    if (dbError.code === "23505") {
      return NextResponse.json(
        {
          success: false,
          message: "This sample is already associated with this experiment.",
        },
        { status: 409 }
      );
    }

    if (dbError.code === "22007" || dbError.code === "22008") {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid date_added value.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Could not add sample to experiment.",
      },
      { status: 500 }
    );
  }
}

// Validate update data
const updateExperimentSampleSchema = z.object({
  date_added: z.string().regex(
    /^\d{4}-\d{2}-\d{2}$/,
    "Date must use YYYY-MM-DD format."
  ).optional(),
  notes: z.string().nullable().optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be provided." }
);

// PATCH: Update an experiment-sample association
export async function PATCH(request: NextRequest) {
  const auth = await authorizeRequest(request, ["Admin", "Researcher", "Lab Technician"]);
  if (auth.response) return auth.response;
  const scope = experimentScope(auth.user);

  try {
    const associationId = Number(
      new URL(request.url).searchParams.get("id")
    );

    if (!Number.isInteger(associationId) || associationId <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "A valid experiment sample ID is required.",
        },
        { status: 400 }
      );
    }

    const body: unknown = await request.json();
    const parsed = updateExperimentSampleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid experiment sample update data.",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { date_added, notes } = parsed.data;

    const result = await pool.query(
      `UPDATE public.experiment_sample
       SET
         date_added = COALESCE($1::date, date_added),
         notes = CASE WHEN $2 THEN $3 ELSE notes END
       WHERE experiment_sample_id = $4
         AND (
           $5::bigint IS NULL OR experiment_id IN (
             SELECT experiment_id FROM public.experiment WHERE researcher_id = $5
           )
         )
       RETURNING *`,
      [
        date_added ?? null,
        notes !== undefined,
        notes ?? null,
        associationId,
        scope,
      ]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Experiment sample association not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Experiment sample association updated successfully.",
      experiment_sample: result.rows[0],
    });
  } catch (error) {
    console.error("Failed to update experiment sample:", error);

    const dbError = error as { code?: string };

    if (dbError.code === "22007" || dbError.code === "22008") {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid date_added value.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Could not update experiment sample association.",
      },
      { status: 500 }
    );
  }
}

// DELETE: Remove an association
export async function DELETE(request: NextRequest) {
  const denied = await authorize(request, ["Admin"]);
  if (denied) return denied;

  try {
    const associationId = Number(
      new URL(request.url).searchParams.get("id")
    );

    if (!Number.isInteger(associationId) || associationId <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "A valid experiment sample ID is required.",
        },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `DELETE FROM public.experiment_sample
       WHERE experiment_sample_id = $1
       RETURNING experiment_sample_id`,
      [associationId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Experiment sample association not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Sample removed from experiment successfully.",
      experiment_sample_id: result.rows[0].experiment_sample_id,
    });
  } catch (error) {
    console.error("Failed to remove experiment sample:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Could not remove sample from experiment.",
      },
      { status: 500 }
    );
  }
}
