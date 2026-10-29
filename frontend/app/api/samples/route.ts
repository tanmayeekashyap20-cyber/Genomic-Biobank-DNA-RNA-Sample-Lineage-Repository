
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const runtime = "nodejs";

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
        s.description
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
