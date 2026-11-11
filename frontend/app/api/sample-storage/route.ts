
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { getAuthenticatedUser, hasRole, type AllowedRole } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const READ_WRITE_ROLES: AllowedRole[] = ["Admin", "Researcher"];
const ADMIN_ONLY: AllowedRole[] = ["Admin"];

async function authorize(
  request: NextRequest,
  allowedRoles: AllowedRole[]
): Promise<NextResponse | null> {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return NextResponse.json(
      { success: false, message: "Authentication required." },
      { status: 401 }
    );
  }

  if (!hasRole(user, allowedRoles)) {
    return NextResponse.json(
      { success: false, message: "You do not have permission to perform this action." },
      { status: 403 }
    );
  }

  return null;
}

// Fetch sample storage assignments and history
export async function GET(request: NextRequest) {
  const denied = await authorize(request, READ_WRITE_ROLES);
  if (denied) return denied;

  try {
    const result = await pool.query(`
      SELECT
        ss.sample_storage_id,
        ss.sample_id,
        ss.storage_id,
        ss.stored_date,
        ss.removed_date,
        su.freezer_id,
        su.rack_no,
        su.box_no,
        su.position,
        su.temperature,
        su.status AS storage_status
      FROM public.sample_storage ss
      JOIN public.storage_unit su
        ON ss.storage_id = su.storage_id
      ORDER BY ss.sample_storage_id
      LIMIT 100
    `);

    return NextResponse.json({
      success: true,
      count: result.rowCount ?? result.rows.length,
      sample_storage: result.rows,
    });
  } catch (error) {
    console.error("Failed to fetch sample storage:", error);

    return NextResponse.json(
      { success: false, message: "Could not fetch sample storage records." },
      { status: 500 }
    );
  }
}

// Validate sample storage assignment data
const createSampleStorageSchema = z.object({
  sample_id: z.number().int().positive(),
  storage_id: z.number().int().positive(),
  stored_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

// Assign a sample to a storage location
export async function POST(request: NextRequest) {
  const denied = await authorize(request, READ_WRITE_ROLES);
  if (denied) return denied;

  const client = await pool.connect();

  try {
    const body: unknown = await request.json();
    const parsed = createSampleStorageSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { sample_id, storage_id, stored_date } = parsed.data;

    await client.query("BEGIN");

    const sampleResult = await client.query(
      `SELECT sample_id
       FROM public.sample
       WHERE sample_id = $1
       FOR UPDATE`,
      [sample_id]
    );

    if (sampleResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { success: false, message: "Sample not found." },
        { status: 404 }
      );
    }

    const storageResult = await client.query(
      `SELECT storage_id, status
       FROM public.storage_unit
       WHERE storage_id = $1
       FOR UPDATE`,
      [storage_id]
    );

    if (storageResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { success: false, message: "Storage unit not found." },
        { status: 404 }
      );
    }

    if (storageResult.rows[0].status !== "available") {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { success: false, message: "This storage unit is not available." },
        { status: 409 }
      );
    }

    const activeAssignment = await client.query(
      `SELECT sample_storage_id
       FROM public.sample_storage
       WHERE sample_id = $1
         AND removed_date IS NULL
       LIMIT 1`,
      [sample_id]
    );

    if (activeAssignment.rowCount !== 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { success: false, message: "This sample already has an active storage assignment." },
        { status: 409 }
      );
    }

    const insertResult = await client.query(
      `INSERT INTO public.sample_storage
        (sample_id, storage_id, stored_date)
       VALUES ($1, $2, COALESCE($3::date, CURRENT_DATE))
       RETURNING *`,
      [sample_id, storage_id, stored_date ?? null]
    );

    await client.query(
      `UPDATE public.storage_unit
       SET status = 'occupied'
       WHERE storage_id = $1`,
      [storage_id]
    );

    await client.query("COMMIT");

    return NextResponse.json(
      {
        success: true,
        message: "Sample assigned to storage successfully.",
        sample_storage: insertResult.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    console.error("Failed to assign sample to storage:", error);

    return NextResponse.json(
      { success: false, message: "Could not assign sample to storage." },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

// Validate sample removal data
const removeSampleStorageSchema = z.object({
  removed_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/),
});

// Record sample removal using /api/sample-storage?id=1
export async function PATCH(request: NextRequest) {
  const denied = await authorize(request, READ_WRITE_ROLES);
  if (denied) return denied;

  const client = await pool.connect();

  try {
    const assignmentId = Number(
      new URL(request.url).searchParams.get("id")
    );

    if (!Number.isInteger(assignmentId) || assignmentId <= 0) {
      return NextResponse.json(
        { success: false, message: "A valid sample storage ID is required." },
        { status: 400 }
      );
    }

    const body: unknown = await request.json();
    const parsed = removeSampleStorageSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "A valid removal date is required in YYYY-MM-DD format.",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    await client.query("BEGIN");

    const existing = await client.query(
      `SELECT sample_storage_id, storage_id, removed_date
       FROM public.sample_storage
       WHERE sample_storage_id = $1
       FOR UPDATE`,
      [assignmentId]
    );

    if (existing.rowCount === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { success: false, message: "Sample storage assignment not found." },
        { status: 404 }
      );
    }

    if (existing.rows[0].removed_date !== null) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { success: false, message: "This sample has already been removed from storage." },
        { status: 409 }
      );
    }

    const updateResult = await client.query(
      `UPDATE public.sample_storage
       SET removed_date = $1
       WHERE sample_storage_id = $2
       RETURNING *`,
      [parsed.data.removed_date, assignmentId]
    );

    await client.query(
      `UPDATE public.storage_unit
       SET status = 'available'
       WHERE storage_id = $1
         AND NOT EXISTS (
           SELECT 1
           FROM public.sample_storage
           WHERE storage_id = $1
             AND removed_date IS NULL
             AND sample_storage_id <> $2
         )`,
      [existing.rows[0].storage_id, assignmentId]
    );

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      message: "Sample removal recorded successfully.",
      sample_storage: updateResult.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    console.error("Failed to record sample removal:", error);

    const dbError = error as { code?: string };

    if (dbError.code === "23514") {
      return NextResponse.json(
        {
          success: false,
          message: "Removal date cannot be earlier than the storage date.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Could not record sample removal." },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

// Delete a sample storage assignment using /api/sample-storage?id=1
export async function DELETE(request: NextRequest) {
  const denied = await authorize(request, ADMIN_ONLY);
  if (denied) return denied;

  const client = await pool.connect();

  try {
    const assignmentId = Number(
      new URL(request.url).searchParams.get("id")
    );

    if (!Number.isInteger(assignmentId) || assignmentId <= 0) {
      return NextResponse.json(
        { success: false, message: "A valid sample storage ID is required." },
        { status: 400 }
      );
    }

    await client.query("BEGIN");

    const existing = await client.query(
      `SELECT sample_storage_id, storage_id, removed_date
       FROM public.sample_storage
       WHERE sample_storage_id = $1
       FOR UPDATE`,
      [assignmentId]
    );

    if (existing.rowCount === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { success: false, message: "Sample storage assignment not found." },
        { status: 404 }
      );
    }

    await client.query(
      `DELETE FROM public.sample_storage
       WHERE sample_storage_id = $1`,
      [assignmentId]
    );

    if (existing.rows[0].removed_date === null) {
      await client.query(
        `UPDATE public.storage_unit
         SET status = 'available'
         WHERE storage_id = $1
           AND NOT EXISTS (
             SELECT 1
             FROM public.sample_storage
             WHERE storage_id = $1
               AND removed_date IS NULL
           )`,
        [existing.rows[0].storage_id]
      );
    }

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      message: "Sample storage assignment deleted successfully.",
      sample_storage_id: assignmentId,
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    console.error("Failed to delete sample storage assignment:", error);

    return NextResponse.json(
      { success: false, message: "Could not delete sample storage assignment." },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
