import { adminDb } from "@/lib/firebaseAdmin";
// Corrected import statement

// Returns the count of pending payments across all events/attendees
export async function getPendingPaymentsCount() {
  let pendingCount = 0;
  const eventsSnap = await adminDb.collection("events").get();

  for (const eventDoc of eventsSnap.docs) {
    // Attendees
    const attendeesSnap = await eventDoc.ref.collection("attendees").get();
    attendeesSnap.forEach((attendeeDoc) => {
      if (attendeeDoc.data().paid_status === "pending") {
        pendingCount++;
      }
    });

    // Uncomment below if you want to include kids_attendance as well
    // const kidsSnap = await eventDoc.ref.collection("kids_attendance").get();
    // kidsSnap.forEach((kidDoc) => {
    //   if (kidDoc.data().paid_status === "pending") {
    //     pendingCount++;
    //   }
    // });
  }

  return pendingCount;
}
