
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

// Check whether adding a parent-child relationship would create a cycle.
async function createsCycle(
  parentSampleId: number,
  childSampleId: number,
  excludeLineageId?: number
) {
  const result = await pool.query(
    `WITH RECURSIVE descendants(sample_id) AS (
       SELECT child_sample_id
       FROM public.sample_lineage
       WHERE parent_sample_id = $1
         AND ($3::bigint IS NULL OR lineage_id <> $3)

       UNION

       SELECT sl.child_sample_id
       FROM public.sample_lineage sl
       JOIN descendants d
         ON sl.parent_sample_id = d.sample_id
       WHERE ($3::bigint IS NULL OR sl.lineage_id <> $3)
     )
     SELECT EXISTS (
       SELECT 1 FROM descendants WHERE sample_id = $2
     ) AS creates_cycle`,
    [childSampleId, parentSampleId, excludeLineageId ?? null]
  );

  return result.rows[0].creates_cycle;
}

// GET: Fetch all sample lineage records
export async function GET(request: NextRequest) {
  const denied = await authorize(request, ["Admin", "Researcher"]);
  if (denied) return denied;

  try {
    const result = await pool.query(`
      SELECT
        sl.lineage_id,
        sl.parent_sample_id,
        sl.child_sample_id,
        sl.relationship_type,
        sl.created_at,
        sl.notes,
        parent_sample.status AS parent_sample_status,
        child_sample.status AS child_sample_status
      FROM public.sample_lineage sl
      JOIN public.sample parent_sample
        ON sl.parent_sample_id = parent_sample.sample_id
      JOIN public.sample child_sample
        ON sl.child_sample_id = child_sample.sample_id
      ORDER BY sl.lineage_id
      LIMIT 100
    `);

    return NextResponse.json({
      success: true,
      count: result.rowCount ?? result.rows.length,
      sample_lineage: result.rows,
    });
  } catch (error) {
    console.error("Failed to fetch sample lineage:", error);

    return NextResponse.json(
      { success: false, message: "Could not fetch sample lineage." },
      { status: 500 }
    );
  }
}

// POST: Validate new lineage data
const createLineageSchema = z.object({
  parent_sample_id: z.number().int().positive(),
  child_sample_id: z.number().int().positive(),
  relationship_type: z.string().trim().max(100).nullable().optional(),
  notes: z.string().nullable().optional(),
}).refine(
  (data) => data.parent_sample_id !== data.child_sample_id,
  {
    message: "Parent and child samples must be different.",
    path: ["child_sample_id"],
  }
);

// POST: Create a sample lineage relationship
export async function POST(request: NextRequest) {
  const denied = await authorize(request, ["Admin", "Researcher"]);
  if (denied) return denied;

  try {
    const body: unknown = await request.json();
    const parsed = createLineageSchema.safeParse(body);

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
      parent_sample_id,
      child_sample_id,
      relationship_type,
      notes,
    } = parsed.data;

    if (await createsCycle(parent_sample_id, child_sample_id)) {
      return NextResponse.json(
        {
          success: false,
          message: "This relationship would create a lineage cycle.",
        },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `INSERT INTO public.sample_lineage
        (parent_sample_id, child_sample_id, relationship_type, notes)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        parent_sample_id,
        child_sample_id,
        relationship_type ?? null,
        notes ?? null,
      ]
    );

    return NextResponse.json(
      {
        success: true,
        message: "Sample lineage created successfully.",
        sample_lineage: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create sample lineage:", error);

    const dbError = error as { code?: string };

    if (dbError.code === "23503") {
      return NextResponse.json(
        {
          success: false,
          message: "The specified parent or child sample does not exist.",
        },
        { status: 400 }
      );
    }

    if (dbError.code === "23505") {
      return NextResponse.json(
        {
          success: false,
          message: "This parent-child relationship already exists.",
        },
        { status: 409 }
      );
    }

    if (dbError.code === "23514") {
      return NextResponse.json(
        {
          success: false,
          message: "Parent and child samples must be different.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Could not create sample lineage." },
      { status: 500 }
    );
  }
}

// PATCH: Validate lineage update data
const updateLineageSchema = z.object({
  parent_sample_id: z.number().int().positive().optional(),
  child_sample_id: z.number().int().positive().optional(),
  relationship_type: z.string().trim().max(100).nullable().optional(),
  notes: z.string().nullable().optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be provided." }
).refine(
  (data) =>
    data.parent_sample_id === undefined ||
    data.child_sample_id === undefined ||
    data.parent_sample_id !== data.child_sample_id,
  {
    message: "Parent and child samples must be different.",
  }
);

// PATCH: Update a lineage record using ?id=1
export async function PATCH(request: NextRequest) {
  const denied = await authorize(request, ["Admin", "Researcher"]);
  if (denied) return denied;

  try {
    const lineageId = Number(
      new URL(request.url).searchParams.get("id")
    );

    if (!Number.isInteger(lineageId) || lineageId <= 0) {
      return NextResponse.json(
        { success: false, message: "A valid lineage ID is required." },
        { status: 400 }
      );
    }

    const body: unknown = await request.json();
    const parsed = updateLineageSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid lineage update data.",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const existing = await pool.query(
      `SELECT parent_sample_id, child_sample_id
       FROM public.sample_lineage
       WHERE lineage_id = $1`,
      [lineageId]
    );

    if (existing.rowCount === 0) {
      return NextResponse.json(
        { success: false, message: "Sample lineage record not found." },
        { status: 404 }
      );
    }

    const parentSampleId =
      parsed.data.parent_sample_id ??
      Number(existing.rows[0].parent_sample_id);

    const childSampleId =
      parsed.data.child_sample_id ??
      Number(existing.rows[0].child_sample_id);

    if (parentSampleId === childSampleId) {
      return NextResponse.json(
        {
          success: false,
          message: "Parent and child samples must be different.",
        },
        { status: 400 }
      );
    }

    if (await createsCycle(parentSampleId, childSampleId, lineageId)) {
      return NextResponse.json(
        {
          success: false,
          message: "This update would create a lineage cycle.",
        },
        { status: 400 }
      );
    }

    const {
      parent_sample_id,
      child_sample_id,
      relationship_type,
      notes,
    } = parsed.data;

    const result = await pool.query(
      `UPDATE public.sample_lineage
       SET
         parent_sample_id = COALESCE($1, parent_sample_id),
         child_sample_id = COALESCE($2, child_sample_id),
         relationship_type =
           CASE WHEN $3 THEN $4 ELSE relationship_type END,
         notes = CASE WHEN $5 THEN $6 ELSE notes END
       WHERE lineage_id = $7
       RETURNING *`,
      [
        parent_sample_id ?? null,
        child_sample_id ?? null,
        relationship_type !== undefined,
        relationship_type ?? null,
        notes !== undefined,
        notes ?? null,
        lineageId,
      ]
    );

    return NextResponse.json({
      success: true,
      message: "Sample lineage updated successfully.",
      sample_lineage: result.rows[0],
    });
  } catch (error) {
    console.error("Failed to update sample lineage:", error);

    const dbError = error as { code?: string };

    if (dbError.code === "23503") {
      return NextResponse.json(
        {
          success: false,
          message: "The specified parent or child sample does not exist.",
        },
        { status: 400 }
      );
    }

    if (dbError.code === "23505") {
      return NextResponse.json(
        {
          success: false,
          message: "This parent-child relationship already exists.",
        },
        { status: 409 }
      );
    }

    if (dbError.code === "23514") {
      return NextResponse.json(
        {
          success: false,
          message: "Parent and child samples must be different.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Could not update sample lineage." },
      { status: 500 }
    );
  }
}

// DELETE: Delete a lineage record using ?id=1
export async function DELETE(request: NextRequest) {
  const denied = await authorize(request, ["Admin"]);
  if (denied) return denied;

  try {
    const lineageId = Number(
      new URL(request.url).searchParams.get("id")
    );

    if (!Number.isInteger(lineageId) || lineageId <= 0) {
      return NextResponse.json(
        { success: false, message: "A valid lineage ID is required." },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `DELETE FROM public.sample_lineage
       WHERE lineage_id = $1
       RETURNING lineage_id`,
      [lineageId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, message: "Sample lineage record not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Sample lineage deleted successfully.",
      lineage_id: result.rows[0].lineage_id,
    });
  } catch (error) {
    console.error("Failed to delete sample lineage:", error);

    return NextResponse.json(
      { success: false, message: "Could not delete sample lineage." },
      { status: 500 }
    );
  }
}
