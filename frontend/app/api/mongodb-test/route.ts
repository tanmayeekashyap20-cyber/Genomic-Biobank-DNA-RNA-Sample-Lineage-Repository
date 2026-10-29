
import { NextResponse } from "next/server";
import clientPromise from "../../../src/lib/mongodb";

export async function GET() {
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
