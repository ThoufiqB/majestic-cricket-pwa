"use client";

import { useManageEvents } from "../useManageEvents";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

/**
 * RequestsSection
 *
 * Displays pending participation requests and exposes buttons for
 * approving or rejecting each one.  A production implementation
 * should include filters, pagination, and more detailed event/player
 * context; here we provide a simplified version that lists all
 * pending requests.
 */
export function RequestsSection() {
  const { requests, approveRequest, rejectRequest, loadingRequests } = useManageEvents();
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Participation requests</h2>
      {loadingRequests ? (
        <p>Loading requests…</p>
      ) : requests.length === 0 ? (
        <p className="text-sm text-muted-foreground">No pending requests.</p>
      ) : (
        <div className="space-y-2">
          {requests.map((req: any) => (
            <div key={req.id} className="border rounded p-3 space-y-2">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{req.subject_name}</p>
                  <p className="text-sm text-muted-foreground">Event: {req.event_id}</p>
                  <p className="text-sm text-muted-foreground">Type: {req.type}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => approveRequest(req.id)}>Approve</Button>
                  <Button size="sm" variant="destructive" onClick={() => rejectRequest(req.id)}>Reject</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <Separator />
    </div>
  );
}