import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { getPendingPaymentsCount } from "../../payments/utils";
import { requireAdminUser } from "@/lib/requireAdmin";
import { deriveCategory } from "@/lib/deriveCategory";

export async function GET() {
  // Check admin auth
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Run queries in parallel for better performance
    const [
      playersSnap,
      kidsSnap,
      upcomingEventsSnap,
    ] = await Promise.all([
      // Get all players
      adminDb.collection("players").get(),
      // Get all active kids
      adminDb.collection("kids_profiles").where("active", "==", true).get(),
      // Get upcoming events (next 7 days)
      adminDb
        .collection("events")
        .where("starts_at", ">=", now.toISOString())
        .where("starts_at", "<=", sevenDaysFromNow.toISOString())
        .get(),
    ]);

      // Dashboard stats API removed as per requirements.
    let menCount = 0;
    let womenCount = 0;
    let juniorsCount = 0;
    const recentSignups: any[] = [];
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    playersSnap.docs.forEach((doc) => {
      const data = doc.data();
      const category = deriveCategory(data.gender, data.hasPaymentManager, data.group, data.groups);
      
      if (category === "men") menCount++;
      else if (category === "women") womenCount++;
      else if (category === "juniors") juniorsCount++;

      // Check for recent signups (created in last 7 days)
      if (data.created_at) {
        const createdAt = new Date(data.created_at);
        if (createdAt >= oneWeekAgo) {
          recentSignups.push({
            id: doc.id,
            name: data.name || data.email,
            type: "signup",
            timestamp: data.created_at,
          });
        }
      }
    });

    // Count pending payments using shared utility
    let pendingPaymentsCount = 0;
    try {
      pendingPaymentsCount = await getPendingPaymentsCount();
    } catch (err) {
      console.error("Failed to count pending payments:", err);
      pendingPaymentsCount = 0;
    }

    // Get recent activity (last few payments marked as paid)
    const recentActivity: any[] = [];
    
    // Add recent signups to activity
    recentSignups.slice(0, 3).forEach((signup) => {
      recentActivity.push({
        id: signup.id,
        type: "signup",
        title: `${signup.name} joined`,
        subtitle: "New member",
        timestamp: signup.timestamp,
      });
    });

    // Get recent events created
    const recentEventsSnap = await adminDb
      .collection("events")
      .orderBy("created_at", "desc")
      .limit(5)
      .get();

    recentEventsSnap.docs.forEach((doc) => {
      const data = doc.data();
      if (data.created_at) {
        const createdAt = new Date(data.created_at);
        if (createdAt >= oneWeekAgo) {
          recentActivity.push({
            id: doc.id,
            type: "event_created",
            title: "New event created",
            subtitle: data.title || "Untitled event",
            timestamp: data.created_at,
          });
        }
      }
    });

    // Sort activity by timestamp (most recent first)
    recentActivity.sort((a, b) => {
      const dateA = new Date(a.timestamp || 0);
      const dateB = new Date(b.timestamp || 0);
      return dateB.getTime() - dateA.getTime();
    });

    const stats = {
      members: {
        men: menCount,
        women: womenCount,
        kids: kidsSnap.size,
        total: menCount + womenCount + kidsSnap.size,
      },
      upcomingEvents: upcomingEventsSnap.size,
      pendingPayments: pendingPaymentsCount,
      recentSignups: recentSignups.length,
      recentActivity: recentActivity.slice(0, 5),
    };

    return NextResponse.json(stats);
  } catch (error: any) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}
