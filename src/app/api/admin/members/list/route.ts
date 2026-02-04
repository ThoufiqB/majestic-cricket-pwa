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
  status?: "active" | "disabled" | "removed";
  kids_count: number;
  created_at?: string;
}

// GET /api/admin/members/list?group=men|women&search=...&role=admin|player&status=active|disabled|removed&includeRemoved=true
export async function GET(req: NextRequest) {
  try {
    await requireAdminUser();

    const { searchParams } = new URL(req.url);
    const groupFilter = searchParams.get("group"); // "men" | "women" | null
    const searchQuery = searchParams.get("search")?.toLowerCase() || "";
    const roleFilter = searchParams.get("role"); // "admin" | "player" | null
    const statusFilter = searchParams.get("status"); // "active" | "disabled" | "removed" | null
    const includeRemoved = searchParams.get("includeRemoved") === "true"; // Default: false

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
        status: data.status || "active",
        kids_count: Array.isArray(data.kids_profiles) ? data.kids_profiles.length : 0,
        created_at: data.created_at?.toDate?.()?.toISOString() || null,
      };
    });

    // Exclude removed members by default
    if (!includeRemoved) {
      members = members.filter((m) => m.status !== "removed");
    }

    // Apply filters
    if (groupFilter) {
      members = members.filter((m) => m.group === groupFilter);
    }

    if (roleFilter) {
      members = members.filter((m) => 
        roleFilter === "admin" ? m.role === "admin" : m.role !== "admin"
      );
    }

    if (statusFilter) {
      members = members.filter((m) => m.status === statusFilter);
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

    // Get kids count
    const kidsSnap = await adminDb.collection("kids_profiles").get();
    const totalKids = kidsSnap.docs.length;

    // Calculate stats excluding removed members (to match the displayed list)
    const nonRemovedPlayers = snap.docs.filter((d) => {
      const status = d.data().status;
      return !status || status !== "removed";
    });

    // Count men and women (including those with missing group data)
    const menCount = nonRemovedPlayers.filter((d) => {
      const group = d.data().group;
      return group === "men" || (!group || group === "");
    }).length;
    
    const womenCount = nonRemovedPlayers.filter((d) => d.data().group === "women").length;

    return ok({
      members,
      count: members.length,
      stats: {
        total: menCount + womenCount + totalKids, // Men + Women + Kids
        men: menCount,
        women: womenCount,
        admins: nonRemovedPlayers.filter((d) => d.data().role === "admin").length,
        active: nonRemovedPlayers.filter((d) => !d.data().status || d.data().status === "active").length,
        disabled: nonRemovedPlayers.filter((d) => d.data().status === "disabled").length,
        removed: snap.docs.filter((d) => d.data().status === "removed").length,
        kids: totalKids,
      },
    });
  } catch (e: any) {
    return handleApiError(e);
  }
}
