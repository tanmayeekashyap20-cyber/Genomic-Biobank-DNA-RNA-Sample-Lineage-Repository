
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ObjectId } from "mongodb";
import clientPromise from "@/src/lib/mongodb";
import { pool } from "@/lib/db";
import { getAuthenticatedUser, hasRole } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const collectionName = "lineage_events";

// Check authentication and permissions
async function authorize(request: NextRequest) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return NextResponse.json(
      { success: false, message: "Authentication required." },
      { status: 401 }
    );
  }

  if (!hasRole(user, ["Admin", "Researcher"])) {
    return NextResponse.json(
      {
        success: false,
        message: "You do not have permission to perform this action.",
      },
      { status: 403 }
    );
  }

  return null;
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
  performedBy: z.string().trim().min(1).max(100).optional(),
});

// Fetch lineage events from MongoDB
export async function GET(request: NextRequest) {
  const denied = await authorize(request);
  if (denied) return denied;

  try {
    const client = await clientPromise;
    const db = client.db("genomic_biobank");

    const events = await db
      .collection(collectionName)
      .find({})
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    return NextResponse.json({
      success: true,
      count: events.length,
      events: events.map((event) => ({
        ...event,
        _id: event._id instanceof ObjectId ? event._id.toString() : event._id,
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

// Create a lineage event in MongoDB
export async function POST(request: NextRequest) {
  const denied = await authorize(request);
  if (denied) return denied;

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

    // Confirm that the sample exists in PostgreSQL
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
    const db = client.db("genomic_biobank");
    const now = new Date();

    const event = {
      ...parsed.data,
      eventDate: parsed.data.eventDate
        ? new Date(parsed.data.eventDate)
        : now,
      createdAt: now,
    };

    const result = await db
      .collection(collectionName)
      .insertOne(event);

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
