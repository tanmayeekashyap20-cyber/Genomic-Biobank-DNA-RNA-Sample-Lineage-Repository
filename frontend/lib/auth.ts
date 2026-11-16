
import { NextRequest, NextResponse } from "next/server";
import { SignJWT, jwtVerify } from "jose";
import { pool } from "@/lib/db";

export const SESSION_COOKIE_NAME = "biobank-session";
export const SESSION_DURATION_SECONDS = 8 * 60 * 60;

export type SessionUser = {
  userId: number;
  username: string;
  email: string;
  role: string;
  researcherId: number | null;
};

export type AllowedRole = "Admin" | "Researcher" | "Lab Technician";

function getAuthSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET is missing or too short.");
  }

  return new TextEncoder().encode(secret);
}

export async function createSessionToken(user: SessionUser) {
  return new SignJWT({
    username: user.username,
    email: user.email,
    role: user.role,
    researcherId: user.researcherId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user.userId))
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(getAuthSecret());
}

export async function verifySessionToken(
  token: string
): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getAuthSecret(), {
      algorithms: ["HS256"],
    });

    const userId = Number(payload.sub);
    const researcherId = payload.researcherId;

    if (
      !Number.isSafeInteger(userId) ||
      userId <= 0 ||
      typeof payload.username !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.role !== "string" ||
      !["Admin", "Researcher", "Lab Technician"].includes(payload.role) ||
      (researcherId !== null &&
        (typeof researcherId !== "number" ||
          !Number.isSafeInteger(researcherId)))
    ) {
      return null;
    }

    return {
      userId,
      username: payload.username,
      email: payload.email,
      role: payload.role,
      researcherId: researcherId as number | null,
    };
  } catch {
    return null;
  }
}

// Verify the signed session and retrieve the current account
// and role from PostgreSQL on every protected API request.
export async function getAuthenticatedUser(
  request: NextRequest
): Promise<SessionUser | null> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!token) return null;

  const session = await verifySessionToken(token);

  if (!session) return null;

  const result = await pool.query(
    `SELECT
       u.user_id,
       u.username,
       u.email,
       u.researcher_id,
       r.role_name
     FROM public.app_user u
     JOIN public.role r ON r.role_id = u.role_id
     WHERE u.user_id = $1
       AND u.is_active = TRUE
     LIMIT 1`,
    [session.userId]
  );

  if (result.rows.length !== 1) return null;

  const account = result.rows[0];

  if (!["Admin", "Researcher", "Lab Technician"].includes(account.role_name)) {
    return null;
  }

  return {
    userId: Number(account.user_id),
    username: account.username,
    email: account.email,
    role: account.role_name,
    researcherId:
      account.researcher_id === null
        ? null
        : Number(account.researcher_id),
  };
}

export function hasRole(
  user: SessionUser,
  allowedRoles: AllowedRole[]
): boolean {
  return allowedRoles.includes(user.role as AllowedRole);
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_DURATION_SECONDS,
};

// Authenticate and check roles in one step, returning the user so routes
// can apply per-user rules (e.g. researchers only see their experiments).
export async function authorizeRequest(
  request: NextRequest,
  allowedRoles: AllowedRole[]
): Promise<
  | { user: SessionUser; response: null }
  | { user: null; response: NextResponse }
> {
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

  if (!hasRole(user, allowedRoles)) {
    return {
      user: null,
      response: NextResponse.json(
        { success: false, message: "You do not have permission for this action." },
        { status: 403 }
      ),
    };
  }

  return { user, response: null };
}

// Researchers work with "My experiments" only: returns the researcher_id
// to filter experiments by, or null when the user may see all of them.
// A Researcher account not linked to a researcher record gets 0, which
// matches nothing.
export function experimentScope(user: SessionUser): number | null {
  if (user.role !== "Researcher") return null;
  return user.researcherId ?? 0;
}
