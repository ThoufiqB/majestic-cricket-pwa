"use client";

import { useMemo } from "react";
import { useManageEvents } from "../useManageEvents";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

function groupBadge(g: string) {
  const gg = String(g || "").toLowerCase();
  if (gg === "men") return <Badge className="bg-blue-100 text-blue-800">Men</Badge>;
  if (gg === "women") return <Badge className="bg-pink-100 text-pink-800">Women</Badge>;
  if (gg === "kids" || gg === "all_kids") return <Badge className="bg-purple-100 text-purple-800">Juniors</Badge>;
  return <Badge variant="outline">{g || "All"}</Badge>;
}

export function RequestsSection() {
  const s = useManageEvents();

  const enriched = useMemo(() => {
    return (s.requests || []).map((req: any) => {
      const ev = s.eventById.get(req.event_id);
      const d = s.toDate(ev?.starts_at);
      const mk = d ? s.monthKey(d) : "";
      const monthLabel = mk ? s.monthLabelFromKey(mk) : "Unknown month";

      const derivedGroup = ev ? s.deriveEventGroup(ev) : "all";
      const groupLabel = derivedGroup === "kids" ? "kids" : (ev?.group || derivedGroup);

      return {
        ...req,
        evTitle: String(ev?.title || "Unknown Event"),
        evWhen: d ? d.toLocaleString() : "",
        evMonthLabel: monthLabel,
        evGroupLabel: String(groupLabel || "all"),
      };
    });
  }, [s.requests, s.eventById, s]);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Participation requests</h2>

      {s.loadingRequests ? (
        <p className="text-sm text-muted-foreground">Loading requests…</p>
      ) : enriched.length === 0 ? (
        <p className="text-sm text-muted-foreground">No pending requests.</p>
      ) : (
        <div className="space-y-2">
          {enriched.map((req: any) => (
            <div key={req.id} className="border rounded p-3 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">{req.subject_name}</p>

                  <div className="flex items-center gap-2 flex-wrap mt-1">
                    {groupBadge(req.evGroupLabel)}
                    <Badge variant="secondary">{req.evMonthLabel}</Badge>
                    <Badge variant="outline" className="capitalize">
                      {String(req.type || "").toLowerCase()}
                    </Badge>
                  </div>

                  <p className="text-sm text-muted-foreground mt-2">
                    Event: <span className="font-medium text-foreground">{req.evTitle}</span>
                  </p>
                  {req.evWhen && (
                    <p className="text-xs text-muted-foreground">
                      {req.evWhen}
                    </p>
                  )}
                </div>

                <div className="flex gap-2 shrink-0">
                  <Button size="sm" onClick={() => s.approveRequest(req.id)}>
                    Approve
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => s.rejectRequest(req.id)}>
                    Reject
                  </Button>
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
