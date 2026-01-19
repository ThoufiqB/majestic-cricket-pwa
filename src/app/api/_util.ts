import { NextResponse } from "next/server";

/**
 * Throw this for controlled errors (validation, forbidden, etc).
 */
export class HttpError extends Error {
  status: number;
  details?: any;
  constructor(status: number, message: string, details?: any) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function badRequest(message: string, details?: any) {
  return new HttpError(400, message, details);
}

export function forbidden(message = "Forbidden") {
  return new HttpError(403, message);
}

export function unauthorized(message = "Unauthorized") {
  return new HttpError(401, message);
}

/**
 * Maps errors to proper HTTP codes.
 * - Auth failures -> 401
 * - Validation -> 400
 * - Permission -> 403
 * - Firestore index issues -> 500 (with a helpful message)
 * - Unknown -> 500
 */
export function handleApiError(e: any) {
  // Our own controlled errors
  if (e instanceof HttpError) {
    return NextResponse.json(
      { error: e.message, details: e.details ?? undefined },
      { status: e.status }
    );
  }

  const msg = String(e?.message || e || "Unknown error");

  // Firestore "missing index" typically surfaces as FAILED_PRECONDITION
  // Admin SDK errors often carry code=9 and message containing FAILED_PRECONDITION + link.
  const code = e?.code;
  const isIndexError =
    code === 9 ||
    msg.includes("FAILED_PRECONDITION") ||
    msg.toLowerCase().includes("requires an index");

  if (isIndexError) {
    // Try to keep the link if present (super useful)
    const match = msg.match(/https:\/\/console\.firebase\.google\.com\/[^\s]+/);
    const link = match?.[0];

    return NextResponse.json(
      {
        error:
          "Firestore query needs a composite index. Create it in Firebase console and retry.",
        index_link: link,
        raw: msg,
      },
      { status: 500 }
    );
  }

  // If your requireSessionUser throws "Missing auth" etc, treat as 401.
  if (msg.toLowerCase().includes("missing auth") || msg.toLowerCase().includes("session")) {
    return NextResponse.json({ error: msg }, { status: 401 });
  }

  return NextResponse.json({ error: msg }, { status: 500 });
}

export function ok(data: any, init?: number) {
  return NextResponse.json(data, { status: init ?? 200 });
}
