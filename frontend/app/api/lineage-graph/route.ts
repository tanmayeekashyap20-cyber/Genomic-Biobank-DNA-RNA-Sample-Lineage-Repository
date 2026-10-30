
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Fetch donors and their samples from PostgreSQL
    const result = await pool.query(`
      SELECT
        d.donor_id,
        d.full_name,
        s.sample_id,
        st.sample_type_name,
        s.status,
        s.collection_date,
        s.description
      FROM public.donor AS d
      LEFT JOIN public.sample AS s
        ON s.donor_id = d.donor_id
      LEFT JOIN public.sample_type AS st
        ON st.sample_type_id = s.sample_type_id
      ORDER BY d.donor_id, s.sample_id
    `);

    // Fetch actual sample-to-sample lineage relationships
    const lineageResult = await pool.query(`
      SELECT
        parent_sample_id,
        child_sample_id,
        relationship_type
      FROM public.sample_lineage
      ORDER BY lineage_id
    `);

    const donors = new Map();

    for (const row of result.rows) {
      if (!donors.has(row.donor_id)) {
        donors.set(row.donor_id, {
          donor_id: String(row.donor_id),
          full_name: row.full_name,
          samples: [],
        });
      }

      if (row.sample_id !== null) {
        donors.get(row.donor_id).samples.push({
          sample_id: String(row.sample_id),
          sample_type_name: row.sample_type_name,
          status: row.status,
          collection_date: row.collection_date,
          description: row.description,
        });
      }
    }

    const lineage = lineageResult.rows.map((row) => ({
      parent_sample_id: String(row.parent_sample_id),
      child_sample_id: String(row.child_sample_id),
      relationship_type: row.relationship_type,
    }));

    return NextResponse.json({
      success: true,
      count: donors.size,
      donors: Array.from(donors.values()),
      lineage,
    });
  } catch (error) {
    console.error("Failed to build lineage graph:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Could not retrieve lineage graph data.",
      },
      { status: 500 }
    );
  }
}
