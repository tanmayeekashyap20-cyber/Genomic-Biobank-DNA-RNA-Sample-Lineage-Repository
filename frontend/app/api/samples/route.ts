
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
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
