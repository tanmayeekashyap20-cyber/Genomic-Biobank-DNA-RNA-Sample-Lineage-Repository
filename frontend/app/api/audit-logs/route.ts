import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getAuthenticatedUser, hasRole } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return NextResponse.json(
      { success: false, message: "Authentication required." },
      { status: 401 }
    );
  }

  if (!hasRole(user, ["Admin"])) {
    return NextResponse.json(
      { success: false, message: "Administrator access is required." },
      { status: 403 }
    );
  }

  try {
    const requestedLimit = Number(
      new URL(request.url).searchParams.get("limit") ?? 100
    );

    const limit = Number.isInteger(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 100)
      : 100;

    const result = await pool.query(
      `SELECT
         audit_id,
         user_id,
         action,
         table_name,
         record_id,
         action_timestamp,
         details
       FROM public.audit_log
       ORDER BY action_timestamp DESC, audit_id DESC
       LIMIT $1`,
      [limit]
    );

    return NextResponse.json({
      success: true,
      count: result.rows.length,
      audit_logs: result.rows,
    });
  } catch (error) {
    console.error("Failed to fetch audit logs:", error);

    return NextResponse.json(
      { success: false, message: "Could not fetch audit logs." },
      { status: 500 }
    );
  }
}
