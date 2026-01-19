import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdminUser } from "@/lib/requireAdmin";

/**
 * POST /api/admin/payments/update
 * 
 * Update payment status for one or more attendance records
 * 
 * Body:
 * - payments: Array of { eventId, profileId, eventType: "adults" | "kids" }
 * - status: "paid" | "pending" | "unpaid" | "rejected"
 */
export async function POST(req: NextRequest) {
  let admin;
  try {
    admin = await requireAdminUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { payments, status } = body;

    if (!payments || !Array.isArray(payments) || payments.length === 0) {
      return NextResponse.json({ error: "payments array required" }, { status: 400 });
    }

    if (!["paid", "pending", "unpaid", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const batch = adminDb.batch();
    let updateCount = 0;

    for (const payment of payments) {
      const { eventId, profileId, eventType } = payment;
      
      if (!eventId || !profileId || !eventType) continue;

      let docRef;
      if (eventType === "kids") {
        docRef = adminDb
          .collection("events")
          .doc(eventId)
          .collection("kids_attendance")
          .doc(profileId);
      } else {
        docRef = adminDb
          .collection("events")
          .doc(eventId)
          .collection("attendees")
          .doc(profileId);
      }

      // Build update data based on event type
      const updateData: any = {
        updated_at: now,
      };

      if (eventType === "kids") {
        updateData.payment_status = status;
      } else {
        updateData.paid_status = status;
      }

      // Add confirmation data if marking as paid
      if (status === "paid") {
        updateData.confirmed_at = now;
        updateData.confirmed_by = admin.user.uid;
      } else if (status === "rejected") {
        updateData.rejected_at = now;
        updateData.rejected_by = admin.user.uid;
      }

      batch.update(docRef, updateData);
      updateCount++;
    }

    if (updateCount === 0) {
      return NextResponse.json({ error: "No valid payments to update" }, { status: 400 });
    }

    await batch.commit();

    return NextResponse.json({
      success: true,
      updated: updateCount,
      status,
    });
  } catch (error) {
    console.error("POST /api/admin/payments/update:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
