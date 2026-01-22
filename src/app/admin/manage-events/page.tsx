"use client";

import { AddPlayersSection } from "./components/AddPlayersSection";
import { RequestsSection } from "./components/RequestsSection";

/**
 * Admin Manage Events Page
 *
 * This page exposes two sections: one for bulk‑adding players to existing
 * events and another for reviewing participation requests.  The
 * implementation of each section is in separate components to keep
 * concerns isolated.  See AddPlayersSection and RequestsSection for
 * details.
 */
export default function ManageEventsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Manage events</h1>
      <AddPlayersSection />
      <RequestsSection />
    </div>
  );
}