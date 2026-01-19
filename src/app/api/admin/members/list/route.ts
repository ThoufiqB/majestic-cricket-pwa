import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdminUser } from "@/lib/requireAdmin";
import { handleApiError, ok } from "@/app/api/_util";

export interface MemberData {
  player_id: string;
  name: string;
  email: string;
  phone?: string;
  group: "men" | "women";
  member_type?: string;
  role?: string;
  kids_count: number;
  created_at?: string;
}

// GET /api/admin/members/list?group=men|women&search=...&role=admin|player
export async function GET(req: NextRequest) {
  try {
    await requireAdminUser();

    const { searchParams } = new URL(req.url);
    const groupFilter = searchParams.get("group"); // "men" | "women" | null
    const searchQuery = searchParams.get("search")?.toLowerCase() || "";
    const roleFilter = searchParams.get("role"); // "admin" | "player" | null

    // Fetch all players
    const snap = await adminDb.collection("players").get();

    let members: MemberData[] = snap.docs.map((doc) => {
      const data = doc.data();
      return {
        player_id: doc.id,
        name: data.name || "Unknown",
        email: data.email || "",
        phone: data.phone || "",
        group: data.group || "men",
        member_type: data.member_type || "regular",
        role: data.role || "player",
        kids_count: Array.isArray(data.kids_profiles) ? data.kids_profiles.length : 0,
        created_at: data.created_at?.toDate?.()?.toISOString() || null,
      };
    });

    // Apply filters
    if (groupFilter) {
      members = members.filter((m) => m.group === groupFilter);
    }

    if (roleFilter) {
      members = members.filter((m) => 
        roleFilter === "admin" ? m.role === "admin" : m.role !== "admin"
      );
    }

    if (searchQuery) {
      members = members.filter(
        (m) =>
          m.name.toLowerCase().includes(searchQuery) ||
          m.email.toLowerCase().includes(searchQuery) ||
          (m.phone && m.phone.includes(searchQuery))
      );
    }

    // Sort by name
    members.sort((a, b) => a.name.localeCompare(b.name));

    return ok({
      members,
      count: members.length,
      stats: {
        total: snap.docs.length,
        men: snap.docs.filter((d) => d.data().group === "men").length,
        women: snap.docs.filter((d) => d.data().group === "women").length,
        admins: snap.docs.filter((d) => d.data().role === "admin").length,
      },
    });
  } catch (e: any) {
    return handleApiError(e);
  }
}
