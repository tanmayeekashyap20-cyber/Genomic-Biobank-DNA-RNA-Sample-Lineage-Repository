
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
      { success: false, message: "You do not have permission to perform this action." },
      { status: 403 }
    );
  }

  return null;
}

// Fetch samples with storage and lineage details
export async function GET(request: NextRequest) {
  const denied = await authorize(request, ["Admin", "Researcher"]);
  if (denied) return denied;

  try {
    const result = await pool.query(`
      SELECT
        s.sample_id,
        s.donor_id,
        st.sample_type_name,
        s.collection_date,
        s.collection_location,
        s.status,
        s.description,

        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'storage_id', su.storage_id,
              'freezer_id', su.freezer_id,
              'rack_no', su.rack_no,
              'box_no', su.box_no,
              'position', su.position,
              'temperature', su.temperature,
              'storage_status', su.status,
              'stored_date', ss.stored_date,
              'removed_date', ss.removed_date
            )
            ORDER BY ss.stored_date DESC
          )
          FROM public.sample_storage AS ss
          JOIN public.storage_unit AS su
            ON su.storage_id = ss.storage_id
          WHERE ss.sample_id = s.sample_id
            AND ss.removed_date IS NULL
        ) AS storage_locations,

        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'related_sample_id', sl.child_sample_id,
              'relationship_type', sl.relationship_type,
              'direction', 'child'
            )
            ORDER BY sl.child_sample_id
          )
          FROM public.sample_lineage AS sl
          WHERE sl.parent_sample_id = s.sample_id
        ) AS lineage_children,

        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'related_sample_id', sl.parent_sample_id,
              'relationship_type', sl.relationship_type,
              'direction', 'parent'
            )
            ORDER BY sl.parent_sample_id
          )
          FROM public.sample_lineage AS sl
          WHERE sl.child_sample_id = s.sample_id
        ) AS lineage_parents

      FROM public.sample AS s
      JOIN public.sample_type AS st
        ON st.sample_type_id = s.sample_type_id
      ORDER BY s.sample_id
      LIMIT 100
    `);

    return NextResponse.json({
      success: true,
      count: result.rowCount ?? result.rows.length,
      samples: result.rows,
    });
  } catch (error) {
    console.error("Failed to fetch samples:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Could not fetch samples from PostgreSQL.",
      },
      { status: 500 }
    );
  }
}

// Validate sample creation data
const createSampleSchema = z.object({
  donor_id: z.number().int().positive(),
  sample_type_id: z.number().int().positive(),
  collection_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  collection_location: z.string().max(255).nullable().optional(),
  status: z.string().max(30).optional(),
  description: z.string().nullable().optional(),
});

// Create a sample
export async function POST(request: NextRequest) {
  const denied = await authorize(request, ["Admin", "Researcher"]);
  if (denied) return denied;

  try {
    const body: unknown = await request.json();
    const parsed = createSampleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const {
      donor_id,
      sample_type_id,
      collection_date,
      collection_location,
      status,
      description,
    } = parsed.data;

    const result = await pool.query(
      `INSERT INTO public.sample
        (donor_id, sample_type_id, collection_date,
         collection_location, status, description)
       VALUES ($1, $2, $3, $4, COALESCE($5, 'collected'), $6)
       RETURNING *`,
      [
        donor_id,
        sample_type_id,
        collection_date,
        collection_location ?? null,
        status ?? null,
        description ?? null,
      ]
    );

    return NextResponse.json(
      {
        success: true,
        message: "Sample created successfully.",
        sample: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create sample:", error);

    const dbError = error as { code?: string };

    if (dbError.code === "23503") {
      return NextResponse.json(
        { success: false, message: "Invalid donor ID or sample type ID." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Could not create sample." },
      { status: 500 }
    );
  }
}

// Validate sample update data
const updateSampleSchema = z.object({
  status: z.string().min(1).max(30).optional(),
  collection_location: z.string().max(255).nullable().optional(),
  description: z.string().nullable().optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be provided." }
);

// Update a sample
export async function PATCH(request: NextRequest) {
  const denied = await authorize(request, ["Admin", "Researcher"]);
  if (denied) return denied;

  try {
    const body: unknown = await request.json();
    const sampleId = Number(new URL(request.url).searchParams.get("id"));

    if (!Number.isInteger(sampleId) || sampleId <= 0) {
      return NextResponse.json(
        { success: false, message: "A valid sample ID is required." },
        { status: 400 }
      );
    }

    const parsed = updateSampleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid update data.",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { status, collection_location, description } = parsed.data;

    const result = await pool.query(
      `UPDATE public.sample
       SET
         status = COALESCE($1, status),
         collection_location = COALESCE($2, collection_location),
         description = COALESCE($3, description)
       WHERE sample_id = $4
       RETURNING *`,
      [
        status ?? null,
        collection_location ?? null,
        description ?? null,
        sampleId,
      ]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, message: "Sample not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Sample updated successfully.",
      sample: result.rows[0],
    });
  } catch (error) {
    console.error("Failed to update sample:", error);

    return NextResponse.json(
      { success: false, message: "Could not update sample." },
      { status: 500 }
    );
  }
}

// Delete a sample
export async function DELETE(request: NextRequest) {
  const denied = await authorize(request, ["Admin"]);
  if (denied) return denied;

  try {
    const sampleId = Number(new URL(request.url).searchParams.get("id"));

    if (!Number.isInteger(sampleId) || sampleId <= 0) {
      return NextResponse.json(
        { success: false, message: "A valid sample ID is required." },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `DELETE FROM public.sample
       WHERE sample_id = $1
       RETURNING sample_id`,
      [sampleId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, message: "Sample not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Sample deleted successfully.",
      sample_id: result.rows[0].sample_id,
    });
  } catch (error) {
    console.error("Failed to delete sample:", error);

    const dbError = error as { code?: string };

    if (dbError.code === "23503") {
      return NextResponse.json(
        {
          success: false,
          message: "This sample is referenced by other records and cannot be deleted.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Could not delete sample." },
      { status: 500 }
    );
  }
}
