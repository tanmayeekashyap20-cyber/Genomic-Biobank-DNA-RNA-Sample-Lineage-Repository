
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getAuthenticatedUser, hasRole } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return NextResponse.json(
      {
        success: false,
        message: "Authentication required.",
      },
      { status: 401 }
    );
  }

  if (!hasRole(user, ["Admin"])) {
    return NextResponse.json(
      {
        success: false,
        message: "You do not have permission to access database diagnostics.",
      },
      { status: 403 }
    );
  }

  try {
    const result = await pool.query(
      "SELECT current_database() AS database, NOW() AS server_time"
    );

    return NextResponse.json({
      success: true,
      message: "PostgreSQL connection successful!",
      database: result.rows[0].database,
      serverTime: result.rows[0].server_time,
    });
  } catch (error) {
    console.error("Database connection failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Could not connect to PostgreSQL.",
      },
      { status: 500 }
    );
  }
}
