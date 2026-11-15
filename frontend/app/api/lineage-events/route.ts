import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ObjectId } from "mongodb";
import clientPromise from "@/src/lib/mongodb";
import { pool } from "@/lib/db";
import { getAuthenticatedUser, hasRole } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const collectionName = "lineage_events";

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

  if (!hasRole(user, ["Admin", "Researcher"])) {
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

function parsePositiveInteger(value: string | null, fallback: number) {
  if (value === null) return fallback;

  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

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

    let sampleId: number | null | undefined;

    if (sampleIdValue !== null) {
      sampleId = parsePositiveInteger(sampleIdValue, 0);

      if (sampleId === null || sampleId < 1) {
        return NextResponse.json(
          { success: false, message: "Invalid sampleId." },
          { status: 400 }
        );
      }
    }

    const client = await clientPromise;
    const collection = client
      .db("genomic_biobank")
      .collection(collectionName);

    const filter = sampleId === undefined ? {} : { sampleId };

    const [events, total] = await Promise.all([
      collection
        .find(filter)
        .sort({ eventDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      collection.countDocuments(filter),
    ]);

    return NextResponse.json({
      success: true,
      count: events.length,
      total,
      limit,
      skip,
      events: events.map((event) => ({
        ...event,
        _id: event._id instanceof ObjectId
          ? event._id.toString()
          : event._id,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch lineage events:", error);

    return NextResponse.json(
      { success: false, message: "Could not retrieve lineage events." },
      { status: 500 }
    );
  }
}

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

    const client = await clientPromise;
    const collection = client
      .db("genomic_biobank")
      .collection(collectionName);

    const now = new Date();

    const event = {
      ...parsed.data,
      performedBy: auth.user!.username,
      performedByUserId: auth.user!.userId,
      eventDate: parsed.data.eventDate
        ? new Date(parsed.data.eventDate)
        : now,
      createdAt: now,
    };

    const result = await collection.insertOne(event);

    return NextResponse.json(
      {
        success: true,
        message: "Lineage event saved.",
        event: {
          ...event,
          _id: result.insertedId.toString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to save lineage event:", error);

    return NextResponse.json(
      { success: false, message: "Could not save lineage event." },
      { status: 500 }
    );
  }
}

