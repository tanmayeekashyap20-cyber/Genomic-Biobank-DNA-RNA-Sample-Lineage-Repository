import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import {
  getAuthenticatedUser,
  hasRole,
  type AllowedRole,
} from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const READ_ROLES: AllowedRole[] = ["Admin", "Researcher"];

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return NextResponse.json(
      { success: false, message: "Authentication required." },
      { status: 401 }
    );
  }

  if (!hasRole(user, READ_ROLES)) {
    return NextResponse.json(
      {
        success: false,
        message: "You do not have permission to view the dashboard.",
      },
      { status: 403 }
    );
  }

  try {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM public.donor) AS donors,

        (SELECT COUNT(*)::int FROM public.sample) AS samples,

        (SELECT COUNT(*)::int FROM public.experiment) AS experiments,

        (
          SELECT COUNT(*)::int
          FROM public.sequencing_result
        ) AS sequencing_results,

        (
          SELECT COUNT(*)::int
          FROM public.sample_storage
          WHERE removed_date IS NULL
        ) AS active_storage_assignments,

        (
          SELECT COALESCE(
            jsonb_agg(
              jsonb_build_object(
                'name', sample_type_name,
                'value', sample_count
              )
              ORDER BY sample_type_name
            ),
            '[]'::jsonb
          )
          FROM (
            SELECT
              st.sample_type_name,
              COUNT(s.sample_id)::int AS sample_count
            FROM public.sample_type st
            LEFT JOIN public.sample s
              ON s.sample_type_id = st.sample_type_id
            GROUP BY st.sample_type_id, st.sample_type_name
          ) AS type_counts
        ) AS sample_types,

        (
          SELECT COALESCE(
            jsonb_agg(
              jsonb_build_object(
                'name', status,
                'count', sample_count
              )
              ORDER BY status
            ),
            '[]'::jsonb
          )
          FROM (
            SELECT
              status,
              COUNT(*)::int AS sample_count
            FROM public.sample
            GROUP BY status
          ) AS status_counts
        ) AS sample_statuses,

        (
          SELECT COALESCE(
            jsonb_agg(
              jsonb_build_object(
                'month', TO_CHAR(month_start, 'Mon'),
                'collected', sample_count
              )
              ORDER BY month_start
            ),
            '[]'::jsonb
          )
          FROM (
            SELECT
              months.month_start,
              COUNT(s.sample_id)::int AS sample_count
            FROM generate_series(
              date_trunc('month', CURRENT_DATE) - INTERVAL '5 months',
              date_trunc('month', CURRENT_DATE),
              INTERVAL '1 month'
            ) AS months(month_start)
            LEFT JOIN public.sample s
              ON date_trunc('month', s.collection_date) = months.month_start
            GROUP BY months.month_start
          ) AS monthly_counts
        ) AS collection_trend,

        (
          SELECT COALESCE(
            jsonb_agg(
              jsonb_build_object(
                'sample_id', recent.sample_id,
                'sample_type_name', recent.sample_type_name,
                'collection_date', recent.collection_date,
                'status', recent.status,
                'lineage_available', recent.lineage_available
              )
              ORDER BY recent.collection_date DESC, recent.sample_id DESC
            ),
            '[]'::jsonb
          )
          FROM (
            SELECT
              s.sample_id,
              st.sample_type_name,
              s.collection_date,
              s.status,
              (
                EXISTS (
                  SELECT 1
                  FROM public.sample_lineage sl
                  WHERE sl.parent_sample_id = s.sample_id
                     OR sl.child_sample_id = s.sample_id
                )
              ) AS lineage_available
            FROM public.sample s
            JOIN public.sample_type st
              ON st.sample_type_id = s.sample_type_id
            ORDER BY s.collection_date DESC, s.sample_id DESC
            LIMIT 5
          ) AS recent
        ) AS recent_samples
    `);

    return NextResponse.json({
      success: true,
      dashboard: result.rows[0],
    });
  } catch (error) {
    console.error("Failed to fetch dashboard summary:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Could not fetch dashboard summary.",
      },
      { status: 500 }
    );
  }
}
