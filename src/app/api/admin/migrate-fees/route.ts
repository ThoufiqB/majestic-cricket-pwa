import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminTs } from "@/lib/firebaseAdmin";
import { requireSessionUser } from "@/lib/requireSession";
import { calculateEventFee } from "@/lib/calculateFee";
import { deriveCategory } from "@/lib/deriveCategory";

/**
 * POST /api/admin/migrate-fees
 * 
 * Data migration script to fix missing fee_due in attendee records.
 * This endpoint recalculates student/youth discounts for all existing attendance records.
 * 
 * CRITICAL BUG FIX:
 * - Admin-added players and approved participation requests were missing fee_due
 * - This caused youth/student players to be charged full price instead of 25% discount
 * - This script backfills the correct discounted fees
 * 
 * Only admins can run this migration.
 * 
 * Query params:
 * - dryRun=true : Preview changes without applying them
 * - limit=N : Process only N records (for testing)
 */
export async function POST(req: NextRequest) {
  try {
    const u = await requireSessionUser();
    if (!u) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Verify admin role
    const meSnap = await adminDb.collection("players").doc(u.uid).get();
    const me: any = meSnap.data() || {};
    if (String(me?.role || "").toLowerCase() !== "admin") {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const dryRun = searchParams.get("dryRun") === "true";
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined;

    console.log(`Starting fee migration... (dryRun: ${dryRun}, limit: ${limit || "none"})`);

    // Fetch all events
    const eventsSnap = await adminDb.collection("events").get();
    const events = new Map<string, any>();
    eventsSnap.docs.forEach((doc) => {
      events.set(doc.id, { id: doc.id, ...doc.data() });
    });

    // Fetch all players
    const playersSnap = await adminDb.collection("players").get();
    const players = new Map<string, any>();
    playersSnap.docs.forEach((doc) => {
      players.set(doc.id, { id: doc.id, ...doc.data() });
    });

    console.log(`Loaded ${events.size} events and ${players.size} players`);

    // Scan all attendee records across all events
    const attendeesSnap = await adminDb.collectionGroup("attendees").get();
    
    const updates: Array<{
      eventId: string;
      playerId: string;
      eventTitle: string;
      playerName: string;
      oldFee: number | null;
      newFee: number;
      reason: string;
    }> = [];

    let processed = 0;
    let needsUpdate = 0;

    for (const doc of attendeesSnap.docs) {
      if (limit && processed >= limit) break;
      
      const attendeeData = doc.data();
      const playerId = doc.id;
      const eventId = doc.ref.parent.parent?.id;
      
      if (!eventId) continue;
      processed++;

      const event = events.get(eventId);
      const player = players.get(playerId);
      
      if (!event || !player) continue;

      const baseFee = Number(event.fee || 0);
      if (baseFee === 0) continue; // Skip free events

      const currentFeeDue = attendeeData.fee_due;
      const eventTargetGroups: string[] = Array.isArray(event.targetGroups) ? event.targetGroups : [];
      
      // Calculate what the fee should be
      const playerGroups = Array.isArray(player.groups) ? player.groups : [];
      const memberType = player.member_type;
      const correctFeeDue = calculateEventFee(baseFee, memberType, playerGroups, eventTargetGroups);

      // Determine if update is needed
      let needsUpdateReason = "";
      
      if (currentFeeDue === null || currentFeeDue === undefined) {
        needsUpdateReason = "Missing fee_due";
        needsUpdate++;
      } else if (Math.abs(Number(currentFeeDue) - correctFeeDue) > 0.01) {
        needsUpdateReason = "Incorrect fee_due";
        needsUpdate++;
      } else {
        continue; // Fee is correct, skip
      }

      const category = deriveCategory(player.gender, player.hasPaymentManager, player.group, player.groups);

      updates.push({
        eventId,
        playerId,
        eventTitle: event.title || "Unknown Event",
        playerName: player.name || player.email || "Unknown",
        oldFee: currentFeeDue !== null && currentFeeDue !== undefined ? Number(currentFeeDue) : null,
        newFee: correctFeeDue,
        reason: needsUpdateReason,
      });

      // Apply update if not dry run
      if (!dryRun) {
        await doc.ref.update({
          fee_due: correctFeeDue,
          category, // Also update category for consistency
          groups: playerGroups, // Store groups for reference
          migration_updated_at: adminTs.now(),
          migration_reason: needsUpdateReason,
        });
      }
    }

    console.log(`Migration complete. Processed: ${processed}, Needs update: ${needsUpdate}`);

    return NextResponse.json({
      success: true,
      dryRun,
      stats: {
        totalProcessed: processed,
        needsUpdate: needsUpdate,
        alreadyCorrect: processed - needsUpdate,
      },
      updates: updates.map((u) => ({
        event: u.eventTitle,
        player: u.playerName,
        oldFee: u.oldFee !== null ? `£${u.oldFee.toFixed(2)}` : "missing",
        newFee: `£${u.newFee.toFixed(2)}`,
        reason: u.reason,
      })),
      message: dryRun
        ? `Preview complete. ${needsUpdate} records need updating. Run without dryRun=true to apply changes.`
        : `Migration complete. Updated ${needsUpdate} records with correct fees.`,
    });
  } catch (e: any) {
    console.error("Migration error:", e);
    return NextResponse.json(
      { error: String(e?.message || e), stack: e?.stack },
      { status: 500 }
    );
  }
}
