import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireSessionUser } from "@/lib/requireSession";

/**
 * GET /api/users/managed-children
 * 
 * Returns a list of youth players whose payment_manager_id matches the current user
 * Used by parents to see which children they manage payments for
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Query players collection for youth players with paymentManagerId === current user
    const managedPlayersSnap = await adminDb
      .collection("players")
      .where("paymentManagerId", "==", user.uid)
      .get();

    const managedChildren = managedPlayersSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        player_id: doc.id,
        name: data.name || "Unknown",
        email: data.email || "",
        groups: data.groups || [],
        yearOfBirth: data.yearOfBirth || null,
      };
    });

    return NextResponse.json({
      success: true,
      managedChildren,
    }, { status: 200 });
  } catch (error) {
    console.error("GET /api/users/managed-children:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
