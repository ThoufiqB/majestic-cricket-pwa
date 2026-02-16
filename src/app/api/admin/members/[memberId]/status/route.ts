import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/requireAdmin";
import { adminDb, adminTs } from "@/lib/firebaseAdmin";
import type { PlayerStatus } from "@/lib/types/auth";
import admin from "firebase-admin";

/**
 * PATCH /api/admin/members/[memberId]/status
 * Update member account status (active/disabled/removed)
 * 
 * Body:
 *   - action: "disable" | "enable" | "remove" | "restore"
 *   - reason?: string (optional reason for the action)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const { me } = await requireAdminUser();
    const adminUid = me.player_id;
    const { memberId } = await params;
    
    if (!memberId) {
      return NextResponse.json({ error: "Missing memberId" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const { action, reason } = body;

    // Validate action
    const validActions = ["disable", "enable", "remove", "restore"];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be: ${validActions.join(", ")}` },
        { status: 400 }
      );
    }

    // Safety check: Cannot change own status
    if (memberId === adminUid) {
      return NextResponse.json(
        { error: "Cannot change your own account status" },
        { status: 403 }
      );
    }

    // Fetch target member
    const memberRef = adminDb.collection("players").doc(memberId);
    const memberSnap = await memberRef.get();

    if (!memberSnap.exists) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const memberData = memberSnap.data();
    const currentStatus: PlayerStatus = memberData?.status || "active";
    const memberRole = memberData?.role || "player";

    // Safety check: If disabling/removing an admin, ensure at least one admin remains
    if ((action === "disable" || action === "remove") && memberRole === "admin") {
      const allPlayersSnap = await adminDb.collection("players").get();
      const activeAdminCount = allPlayersSnap.docs.filter((doc) => {
        const data = doc.data();
        const isAdmin = data.role === "admin";
        const isActive = data.status === "active" || !data.status; // Treat missing status as active
        return isAdmin && isActive && doc.id !== memberId; // Exclude target member
      }).length;

      if (activeAdminCount === 0) {
        return NextResponse.json(
          { error: "Cannot disable/remove the last active admin. Promote another member first." },
          { status: 403 }
        );
      }
    }

    // Determine new status based on action
    let newStatus: PlayerStatus;
    let actionVerb: string;

    switch (action) {
      case "disable":
        if (currentStatus === "disabled") {
          return NextResponse.json(
            { error: "Member is already disabled" },
            { status: 400 }
          );
        }
        if (currentStatus === "removed") {
          return NextResponse.json(
            { error: "Cannot disable a removed member. Restore them first." },
            { status: 400 }
          );
        }
        newStatus = "disabled";
        actionVerb = "disabled";
        break;

      case "enable":
        if (currentStatus === "active") {
          return NextResponse.json(
            { error: "Member is already active" },
            { status: 400 }
          );
        }
        if (currentStatus === "removed") {
          return NextResponse.json(
            { error: "Cannot enable a removed member. Use restore action instead." },
            { status: 400 }
          );
        }
        newStatus = "active";
        actionVerb = "enabled";
        break;

      case "remove":
        if (currentStatus === "removed") {
          return NextResponse.json(
            { error: "Member is already removed" },
            { status: 400 }
          );
        }
        newStatus = "removed";
        actionVerb = "removed";
        break;

      case "restore":
        if (currentStatus !== "removed") {
          return NextResponse.json(
            { error: "Only removed members can be restored" },
            { status: 400 }
          );
        }
        newStatus = "active";
        actionVerb = "restored";
        break;

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }

    // Update member status with audit trail
    const updateData: Record<string, any> = {
      status: newStatus,
      status_updated_at: adminTs.now(),
      status_updated_by: adminUid,
      updated_at: adminTs.now(),
    };

    if (reason) {
      updateData.status_reason = reason;
    }

    // Add to status history for audit trail
    const statusHistoryEntry = {
      action: action,
      from_status: currentStatus,
      to_status: newStatus,
      performed_by: adminUid,
      performed_at: adminTs.now(),
      reason: reason || null,
    };

    await memberRef.update({
      ...updateData,
      status_history: admin.firestore.FieldValue.arrayUnion(statusHistoryEntry),
    });

    return NextResponse.json({
      ok: true,
      message: `Member ${actionVerb} successfully`,
      member_id: memberId,
      new_status: newStatus,
      action: action,
    });
  } catch (e: any) {
    console.error("Error updating member status:", e);
    return NextResponse.json(
      { error: String(e?.message || e) },
      { status: e?.message?.includes("Forbidden") ? 403 : 500 }
    );
  }
}
