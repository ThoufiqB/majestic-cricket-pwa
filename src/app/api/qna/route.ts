import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminTs } from "@/lib/firebaseAdmin";
import { requireSessionUser } from "@/lib/requireSession";
import { handleApiError, badRequest, ok } from "@/app/api/_util";

function toIso(v: any): string | null {
  if (!v) return null;
  if (typeof v === "string") return v;
  if (v instanceof Date) return v.toISOString();
  if (typeof v?.toDate === "function") return v.toDate().toISOString();
  return null;
}

function mapQnaDoc(d: FirebaseFirestore.QueryDocumentSnapshot) {
  const raw: any = d.data() || {};
  return {
    id: d.id,
    ...raw,
    asked_at: toIso(raw.asked_at),
    answered_at: toIso(raw.answered_at),
  };
}

export async function GET(req: NextRequest) {
  try {
    await requireSessionUser();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status"); // "open" | "answered" | null (all)
    const limitStr = searchParams.get("limit");
    const parsedLimit = limitStr ? parseInt(limitStr, 10) : 50;
    const limit = Math.min(Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 50, 100);

    let q: FirebaseFirestore.Query = adminDb.collection("qna").orderBy("asked_at", "desc");

    if (status === "open" || status === "answered") {
      q = q.where("status", "==", status);
    }

    q = q.limit(limit);
    const snap = await q.get();
    const questions = snap.docs.map(mapQnaDoc);

    return ok({ questions });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const u = await requireSessionUser();

    const body = await req.json().catch(() => ({}));
    const question = String(body.question || "").trim();

    if (!question) throw badRequest("question is required");
    if (question.length > 1000) throw badRequest("question must be 1000 characters or fewer");

    const docRef = adminDb.collection("qna").doc();
    const now = adminTs.now();

    await docRef.set({
      question,
      asked_by: u.uid,
      asked_by_name: u.name || u.email,
      asked_at: now,
      status: "open",
      answer: null,
      answered_by: null,
      answered_by_name: null,
      answered_at: null,
      is_admin_answer: false,
    });

    return NextResponse.json({ id: docRef.id }, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
