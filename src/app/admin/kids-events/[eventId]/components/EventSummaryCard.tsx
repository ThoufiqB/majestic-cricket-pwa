
import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Baby, Calendar, Clock, Loader2, CheckCircle2, Lightbulb } from "lucide-react";
import type { EventInfo, Totals } from "../types";
import { money } from "../helpers";

type Props = {
  event: EventInfo | null;
  totals: Totals;
  rowsCount: number;
  saving: string;
  onBulkMarkAttendedYes: () => void;
};

export function EventSummaryCard(p: Props) {
  if (!p.event) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-sm text-muted-foreground">Loading event...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-2">
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between w-full min-w-0">
          <div className="flex flex-col min-w-0">
            <h2 className="truncate font-semibold text-base flex items-center gap-2">
              <Baby className="h-5 w-5 text-accent" />
              {p.event.title}
            </h2>
            <span className="text-xs text-muted-foreground font-normal mt-0.5 inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(p.event.starts_at).toLocaleString()}
            </span>
          </div>
          <span className="font-bold text-base text-blue-600 whitespace-nowrap">
            £{money(p.event.fee)}
          </span>
        </div>

        {/* Stat Tiles - unified with adult card */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="rounded-xl border px-2 py-2 sm:px-3 min-w-0 break-words flex flex-col items-center justify-center bg-blue-50">
            <div className="text-[11px] text-muted-foreground leading-none text-center">Attending</div>
            <div className="mt-1 text-sm font-semibold leading-none text-center">{p.totals.yesCount}</div>
          </div>
          <div className="rounded-xl border px-2 py-2 sm:px-3 min-w-0 break-words flex flex-col items-center justify-center bg-yellow-50">
            <div className="text-[11px] text-muted-foreground leading-none text-center">Expected</div>
            <div className="mt-1 text-sm font-semibold leading-none text-center">£{money(p.totals.expectedSum)}</div>
          </div>
          <div className="rounded-xl border px-2 py-2 sm:px-3 min-w-0 break-words flex flex-col items-center justify-center bg-green-50">
            <div className="text-[11px] text-muted-foreground leading-none text-center">Confirmed</div>
            <div className="mt-1 text-sm font-semibold leading-none text-center">£{money(p.totals.paidConfirmedSum)}</div>
          </div>
          <div className="rounded-xl border px-2 py-2 sm:px-3 min-w-0 break-words flex flex-col items-center justify-center bg-orange-50">
            <div className="text-[11px] text-muted-foreground leading-none text-center">Pending</div>
            <div className="mt-1 text-sm font-semibold leading-none text-center">£{money(p.totals.pendingSum)}</div>
          </div>
        </div>

        {/* Status Row - perfectly unified with adult card */}
        <div className="my-2 flex flex-wrap gap-x-4 gap-y-2 justify-center items-center">
          <div className="flex items-center gap-1 min-w-[70px] justify-center">
            <span className="inline-flex items-center justify-center rounded-full bg-green-50 border border-green-200 text-green-700 font-semibold w-7 h-7 text-xs">{p.totals.paidCount}</span>
            <span className="text-xs">Paid</span>
          </div>
          <div className="flex items-center gap-1 min-w-[70px] justify-center">
            <span className="inline-flex items-center justify-center rounded-full bg-blue-50 border border-blue-200 text-blue-700 font-semibold w-7 h-7 text-xs">{p.totals.pendingCount}</span>
            <span className="text-xs">Pending</span>
          </div>
          <div className="flex items-center gap-1 min-w-[70px] justify-center">
            <span className="inline-flex items-center justify-center rounded-full bg-red-50 border border-red-200 text-red-700 font-semibold w-7 h-7 text-xs">{p.totals.rejectedCount}</span>
            <span className="text-xs">Rejected</span>
          </div>
          <div className="flex items-center gap-1 min-w-[70px] justify-center">
            <span className="inline-flex items-center justify-center rounded-full bg-gray-50 border border-gray-200 text-gray-700 font-semibold w-7 h-7 text-xs">{p.totals.unpaidCount}</span>
            <span className="text-xs">Unpaid</span>
          </div>
        </div>

        {/* Bulk Action */}
        <Button
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
          disabled={p.saving === "bulk" || p.rowsCount === 0}
          onClick={p.onBulkMarkAttendedYes}
        >
          {p.saving === "bulk" ? "Updating..." : "Mark All Attended"}
        </Button>

        {/* Tip (restyled to match adult card, or removed if not present in adult) */}
        {/* No tip section, matching adult card style */}
      </CardContent>
    </Card>
  );
}
