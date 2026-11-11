
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "../../../src/lib/mongodb";
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
        message: "You do not have permission to access MongoDB diagnostics.",
      },
      { status: 403 }
    );
  }

  try {
    const client = await clientPromise;
    await client.db("genomic_biobank").command({ ping: 1 });

    return NextResponse.json({
      success: true,
      message: "MongoDB Atlas connected successfully!",
    });
  } catch (error) {
    console.error("MongoDB connection failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "MongoDB connection failed. Check server logs.",
      },
      { status: 500 }
    );
  }
}
