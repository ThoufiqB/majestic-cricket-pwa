import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

/**
 * GET /api/users/search?name=searchTerm
 * Search for active users by name (for payment manager selection)
 * Returns matching users with name, email, player_id
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const searchTerm = searchParams.get("name");

    if (!searchTerm || searchTerm.trim().length < 2) {
      return NextResponse.json(
        { error: "Search term must be at least 2 characters" },
        { status: 400 }
      );
    }

    const normalizedSearch = searchTerm.trim().toLowerCase();

    // Query active players
    const playersSnap = await adminDb
      .collection("players")
      .where("status", "==", "active")
      .get();

    // Filter by name (case-insensitive partial match)
    const matchingUsers = playersSnap.docs
      .map(doc => {
        const data = doc.data();
        return {
          player_id: doc.id,
          name: data.name || "",
          email: data.email || "",
          nameLower: (data.name || "").toLowerCase(),
        };
      })
      .filter(user => user.nameLower.includes(normalizedSearch))
      .slice(0, 10) // Limit to 10 results
      .map(({ player_id, name, email }) => ({
        player_id,
        name,
        email,
      }));

    return NextResponse.json({ users: matchingUsers });
  } catch (e: any) {
    console.error("Error searching users:", e);
    return NextResponse.json(
      { error: "Failed to search users" },
      { status: 500 }
    );
  }
}
