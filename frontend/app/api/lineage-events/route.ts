
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { getAuthenticatedUser, hasRole } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function authorize(request: NextRequest) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return {
      user: null,
      response: NextResponse.json(
        { success: false, message: "Authentication required." },
        { status: 401 }
      ),
    };
  }

  if (!hasRole(user, ["Admin", "Researcher", "Lab Technician"])) {
    return {
      user: null,
      response: NextResponse.json(
        {
          success: false,
          message: "You do not have permission to perform this action.",
        },
        { status: 403 }
      ),
    };
  }

  return { user, response: null };
}

const lineageEventSchema = z.object({
  sampleId: z.coerce.number().int().positive(),
  eventType: z.enum([
    "collected",
    "processed",
    "stored",
    "transferred",
    "sequenced",
  ]),
  description: z.string().trim().min(3).max(500),
  eventDate: z.string().datetime({ offset: true }).optional(),
});

function parsePositiveInteger(
  value: string | null,
  fallback: number
): number | null {
  if (value === null) return fallback;

  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

// Fetch lineage events from PostgreSQL.
export async function GET(request: NextRequest) {
  const auth = await authorize(request);
  if (auth.response) return auth.response;

  try {
    const searchParams = request.nextUrl.searchParams;

    const sampleIdValue = searchParams.get("sampleId");
    const limit = parsePositiveInteger(searchParams.get("limit"), 100);
    const skip = parsePositiveInteger(searchParams.get("skip"), 0);

    if (limit === null || limit < 1 || limit > 100 || skip === null) {
      return NextResponse.json(
        { success: false, message: "Invalid pagination parameters." },
        { status: 400 }
      );
    }

    let sampleId: number | undefined;

    if (sampleIdValue !== null) {
      const parsedSampleId = parsePositiveInteger(sampleIdValue, 0);

      if (parsedSampleId === null || parsedSampleId < 1) {
        return NextResponse.json(
          { success: false, message: "Invalid sampleId." },
          { status: 400 }
        );
      }

      sampleId = parsedSampleId;
    }

    const values: number[] = [];
    let whereClause = "";

    if (sampleId !== undefined) {
      values.push(sampleId);
      whereClause = "WHERE sample_id = $1";
    }

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM public.sample_lineage
       ${whereClause}`,
      values
    );

    const paginationValues = [...values, limit, skip];
    const limitPosition = values.length + 1;
    const offsetPosition = values.length + 2;

    const eventsResult = await pool.query(
      `SELECT *
       FROM public.sample_lineage
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${limitPosition}
       OFFSET $${offsetPosition}`,
      paginationValues
    );

    return NextResponse.json({
      success: true,
      count: eventsResult.rows.length,
      total: countResult.rows[0].total,
      limit,
      skip,
      events: eventsResult.rows,
    });
  } catch (error) {
    console.error("Failed to fetch lineage events:", error);

    return NextResponse.json(
      { success: false, message: "Could not retrieve lineage events." },
      { status: 500 }
    );
  }
}

// Create a lineage event in PostgreSQL.
export async function POST(request: NextRequest) {
  const auth = await authorize(request);
  if (auth.response) return auth.response;

  try {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Request body must be valid JSON." },
        { status: 400 }
      );
    }

    const parsed = lineageEventSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid lineage event data.",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const sampleCheck = await pool.query(
      "SELECT sample_id FROM public.sample WHERE sample_id = $1",
      [parsed.data.sampleId]
    );

    if (sampleCheck.rowCount === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "The specified sample does not exist in PostgreSQL.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message:
          "The existing sample_lineage table requires parent/child sample relationships. The event cannot be stored until its schema is mapped.",
      },
      { status: 501 }
    );
  } catch (error) {
    console.error("Failed to save lineage event:", error);

    return NextResponse.json(
      { success: false, message: "Could not save lineage event." },
      { status: 500 }
    );
  }
}
