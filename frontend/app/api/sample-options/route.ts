import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [donors, sampleTypes] = await Promise.all([
      pool.query(`
        SELECT donor_id, full_name
        FROM public.donor
        ORDER BY donor_id
      `),
      pool.query(`
        SELECT sample_type_id, sample_type_name
        FROM public.sample_type
        ORDER BY sample_type_id
      `),
    ]);

    return NextResponse.json({
      success: true,
      donors: donors.rows,
      sampleTypes: sampleTypes.rows,
    });
  } catch (error) {
    console.error("Failed to fetch sample options:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Could not fetch donor and sample-type options.",
      },
      { status: 500 }
    );
  }
}