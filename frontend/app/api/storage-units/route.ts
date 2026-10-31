
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Fetch storage units
export async function GET() {
  try {
    const result = await pool.query(`
      SELECT
        storage_id,
        freezer_id,
        rack_no,
        box_no,
        position,
        temperature,
        status
      FROM public.storage_unit
      ORDER BY storage_id
      LIMIT 100
    `);

    return NextResponse.json({
      success: true,
      count: result.rowCount ?? result.rows.length,
      storage_units: result.rows,
    });
  } catch (error) {
    console.error("Failed to fetch storage units:", error);

    return NextResponse.json(
      { success: false, message: "Could not fetch storage units." },
      { status: 500 }
    );
  }
}

// Validate storage unit creation data
const createStorageUnitSchema = z.object({
  freezer_id: z.string().trim().max(50).nullable().optional(),
  rack_no: z.string().trim().max(50).nullable().optional(),
  box_no: z.string().trim().max(50).nullable().optional(),
  position: z.string().trim().max(50).nullable().optional(),
  temperature: z.number().min(-999.99).max(999.99).nullable().optional(),
  status: z.string().trim().min(1).max(30).optional(),
});

// Create a storage unit
export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const parsed = createStorageUnitSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const {
      freezer_id,
      rack_no,
      box_no,
      position,
      temperature,
      status,
    } = parsed.data;

    const result = await pool.query(
      `INSERT INTO public.storage_unit
        (freezer_id, rack_no, box_no, position, temperature, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        freezer_id ?? null,
        rack_no ?? null,
        box_no ?? null,
        position ?? null,
        temperature ?? null,
        status ?? "available",
      ]
    );

    return NextResponse.json(
      {
        success: true,
        message: "Storage unit created successfully.",
        storage_unit: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create storage unit:", error);

    return NextResponse.json(
      { success: false, message: "Could not create storage unit." },
      { status: 500 }
    );
  }
}

// Validate storage unit update data
const updateStorageUnitSchema = z.object({
  freezer_id: z.string().trim().max(50).nullable().optional(),
  rack_no: z.string().trim().max(50).nullable().optional(),
  box_no: z.string().trim().max(50).nullable().optional(),
  position: z.string().trim().max(50).nullable().optional(),
  temperature: z.number().min(-999.99).max(999.99).nullable().optional(),
  status: z.string().trim().min(1).max(30).optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be provided." }
);

// Update storage unit using /api/storage-units?id=1
export async function PATCH(request: NextRequest) {
  try {
    const storageId = Number(
      new URL(request.url).searchParams.get("id")
    );

    if (!Number.isInteger(storageId) || storageId <= 0) {
      return NextResponse.json(
        { success: false, message: "A valid storage ID is required." },
        { status: 400 }
      );
    }

    const body: unknown = await request.json();
    const parsed = updateStorageUnitSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid storage unit update data.",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const {
      freezer_id,
      rack_no,
      box_no,
      position,
      temperature,
      status,
    } = parsed.data;

    const result = await pool.query(
      `UPDATE public.storage_unit
       SET
         freezer_id = CASE WHEN $1 THEN $2 ELSE freezer_id END,
         rack_no = CASE WHEN $3 THEN $4 ELSE rack_no END,
         box_no = CASE WHEN $5 THEN $6 ELSE box_no END,
         position = CASE WHEN $7 THEN $8 ELSE position END,
         temperature = CASE WHEN $9 THEN $10 ELSE temperature END,
         status = CASE WHEN $11 THEN $12 ELSE status END
       WHERE storage_id = $13
       RETURNING *`,
      [
        freezer_id !== undefined,
        freezer_id ?? null,
        rack_no !== undefined,
        rack_no ?? null,
        box_no !== undefined,
        box_no ?? null,
        position !== undefined,
        position ?? null,
        temperature !== undefined,
        temperature ?? null,
        status !== undefined,
        status ?? null,
        storageId,
      ]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, message: "Storage unit not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Storage unit updated successfully.",
      storage_unit: result.rows[0],
    });
  } catch (error) {
    console.error("Failed to update storage unit:", error);

    return NextResponse.json(
      { success: false, message: "Could not update storage unit." },
      { status: 500 }
    );
  }
}

// Delete storage unit using /api/storage-units?id=1
export async function DELETE(request: NextRequest) {
  try {
    const storageId = Number(
      new URL(request.url).searchParams.get("id")
    );

    if (!Number.isInteger(storageId) || storageId <= 0) {
      return NextResponse.json(
        { success: false, message: "A valid storage ID is required." },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `DELETE FROM public.storage_unit
       WHERE storage_id = $1
       RETURNING storage_id`,
      [storageId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, message: "Storage unit not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Storage unit deleted successfully.",
      storage_id: result.rows[0].storage_id,
    });
  } catch (error) {
    console.error("Failed to delete storage unit:", error);

    const dbError = error as { code?: string };

    if (dbError.code === "23503") {
      return NextResponse.json(
        {
          success: false,
          message: "This storage unit is referenced by sample storage records and cannot be deleted.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Could not delete storage unit." },
      { status: 500 }
    );
  }
}
