
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
      { success: false, message: "You do not have permission for this action." },
      { status: 403 }
    );
  }

  return null;
}

// Fetch experiments with researcher names
export async function GET(request: NextRequest) {
  const denied = await authorize(request, ["Admin", "Researcher"]);
  if (denied) return denied;

  try {
    const result = await pool.query(`
      SELECT
        e.experiment_id,
        e.experiment_name,
        e.experiment_type,
        e.start_date,
        e.end_date,
        e.researcher_id,
        r.full_name AS researcher_name,
        e.status,
        e.description
      FROM public.experiment AS e
      JOIN public.researcher AS r
        ON r.researcher_id = e.researcher_id
      ORDER BY e.experiment_id
      LIMIT 100
    `);

    return NextResponse.json({
      success: true,
      count: result.rowCount ?? result.rows.length,
      experiments: result.rows,
    });
  } catch (error) {
    console.error("Failed to fetch experiments:", error);

    return NextResponse.json(
      { success: false, message: "Could not fetch experiments." },
      { status: 500 }
    );
  }
}

// Validate experiment creation data
const createExperimentSchema = z.object({
  experiment_name: z.string().trim().min(1).max(150),
  experiment_type: z.string().trim().max(100).nullable().optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  researcher_id: z.number().int().positive(),
  status: z.string().trim().min(1).max(30).optional(),
  description: z.string().nullable().optional(),
}).refine(
  (data) =>
    !data.start_date ||
    !data.end_date ||
    data.end_date >= data.start_date,
  {
    message: "End date cannot be earlier than start date.",
    path: ["end_date"],
  }
);

// Create an experiment
export async function POST(request: NextRequest) {
  const denied = await authorize(request, ["Admin", "Researcher"]);
  if (denied) return denied;

  try {
    const body: unknown = await request.json();
    const parsed = createExperimentSchema.safeParse(body);

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
      experiment_name,
      experiment_type,
      start_date,
      end_date,
      researcher_id,
      status,
      description,
    } = parsed.data;

    const result = await pool.query(
      `INSERT INTO public.experiment
        (experiment_name, experiment_type, start_date, end_date,
         researcher_id, status, description)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'planned'), $7)
       RETURNING *`,
      [
        experiment_name,
        experiment_type ?? null,
        start_date ?? null,
        end_date ?? null,
        researcher_id,
        status ?? null,
        description ?? null,
      ]
    );

    return NextResponse.json(
      {
        success: true,
        message: "Experiment created successfully.",
        experiment: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create experiment:", error);

    const dbError = error as { code?: string };

    if (dbError.code === "23503") {
      return NextResponse.json(
        { success: false, message: "The specified researcher does not exist." },
        { status: 400 }
      );
    }

    if (dbError.code === "23514") {
      return NextResponse.json(
        { success: false, message: "End date cannot be earlier than start date." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Could not create experiment." },
      { status: 500 }
    );
  }
}

// Validate experiment update data
const updateExperimentSchema = z.object({
  experiment_name: z.string().trim().min(1).max(150).optional(),
  experiment_type: z.string().trim().max(100).nullable().optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  researcher_id: z.number().int().positive().optional(),
  status: z.string().trim().min(1).max(30).optional(),
  description: z.string().nullable().optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be provided." }
);

// Update experiment
export async function PATCH(request: NextRequest) {
  const denied = await authorize(request, ["Admin", "Researcher"]);
  if (denied) return denied;

  try {
    const experimentId = Number(
      new URL(request.url).searchParams.get("id")
    );

    if (!Number.isInteger(experimentId) || experimentId <= 0) {
      return NextResponse.json(
        { success: false, message: "A valid experiment ID is required." },
        { status: 400 }
      );
    }

    const body: unknown = await request.json();
    const parsed = updateExperimentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid experiment update data.",
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
    } = parsed.data;

    const result = await pool.query(
      `UPDATE public.experiment
       SET
         experiment_name = COALESCE($1, experiment_name),
         experiment_type = CASE WHEN $2 THEN $3 ELSE experiment_type END,
         start_date = CASE WHEN $4 THEN $5::date ELSE start_date END,
         end_date = CASE WHEN $6 THEN $7::date ELSE end_date END,
         researcher_id = COALESCE($8, researcher_id),
         status = COALESCE($9, status),
         description = CASE WHEN $10 THEN $11 ELSE description END
       WHERE experiment_id = $12
       RETURNING *`,
      [
        experiment_name ?? null,
        experiment_type !== undefined,
        experiment_type ?? null,
        start_date !== undefined,
        start_date ?? null,
        end_date !== undefined,
        end_date ?? null,
        researcher_id ?? null,
        status ?? null,
        description !== undefined,
        description ?? null,
        experimentId,
      ]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, message: "Experiment not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Experiment updated successfully.",
      experiment: result.rows[0],
    });
  } catch (error) {
    console.error("Failed to update experiment:", error);

    const dbError = error as { code?: string };

    if (dbError.code === "23503") {
      return NextResponse.json(
        { success: false, message: "The specified researcher does not exist." },
        { status: 400 }
      );
    }

    if (dbError.code === "23514") {
      return NextResponse.json(
        { success: false, message: "End date cannot be earlier than start date." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Could not update experiment." },
      { status: 500 }
    );
  }
}

// Delete experiment - Admin only
export async function DELETE(request: NextRequest) {
  const denied = await authorize(request, ["Admin"]);
  if (denied) return denied;

  try {
    const experimentId = Number(
      new URL(request.url).searchParams.get("id")
    );

    if (!Number.isInteger(experimentId) || experimentId <= 0) {
      return NextResponse.json(
        { success: false, message: "A valid experiment ID is required." },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `DELETE FROM public.experiment
       WHERE experiment_id = $1
       RETURNING experiment_id`,
      [experimentId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, message: "Experiment not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Experiment deleted successfully.",
      experiment_id: result.rows[0].experiment_id,
    });
  } catch (error) {
    console.error("Failed to delete experiment:", error);

    const dbError = error as { code?: string };

    if (dbError.code === "23503") {
      return NextResponse.json(
        {
          success: false,
          message: "This experiment is referenced by other records and cannot be deleted.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Could not delete experiment." },
      { status: 500 }
    );
  }
}
