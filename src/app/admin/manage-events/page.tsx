"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddPlayersSection } from "./components/AddPlayersSection";
import { RequestsSection } from "./components/RequestsSection";

/**
 * Admin Manage Events Page
 *
 * Phase-1 UI:
 * - Add desktop-friendly structure (Tabs)
 * - Keep existing modules isolated and unchanged
 * - No logic/API changes
 */
export default function ManageEventsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Manage events</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Add players to an event or review participation requests.
        </p>
      </div>

      <Tabs defaultValue="add" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="add">Add to Event</TabsTrigger>
          <TabsTrigger value="requests">Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="add" className="mt-4">
          <AddPlayersSection />
        </TabsContent>

        <TabsContent value="requests" className="mt-4">
          <RequestsSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
