
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ObjectId } from "mongodb";
import clientPromise from "@/src/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

const collectionName = "lineage_events";

export async function GET() {
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

export async function POST(request: NextRequest) {
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
