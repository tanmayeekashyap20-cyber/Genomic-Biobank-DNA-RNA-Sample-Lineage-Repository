
import { NextRequest, NextResponse } from "next/server";
import {
  getAuthenticatedUser,
  SESSION_COOKIE_NAME,
} from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      const response = NextResponse.json(
        {
          authenticated: false,
          error: "Not authenticated or session is invalid.",
        },
        { status: 401 }
      );

      response.cookies.delete(SESSION_COOKIE_NAME);
      return response;
    }

    return NextResponse.json({
      authenticated: true,
      user,
    });
  } catch (error) {
    console.error("Session verification error:", error);

    return NextResponse.json(
      { error: "Unable to verify session." },
      { status: 500 }
    );
  }
}
