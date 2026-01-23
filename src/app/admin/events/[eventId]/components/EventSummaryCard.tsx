"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Banknote, 
  CreditCard, 
  Clock, 
  CheckCircle2,
  Loader2,
  Calendar,
  Lightbulb
} from "lucide-react";
import { EVENT_TYPE_LABEL } from "../constants";
import type { EventInfo, Totals } from "../types";
import { money } from "../helpers";

type Props = {
  eventId: string;
  event: EventInfo;
  totals: Totals;
  rowsCount: number;
  saving: string;
  onBulkMarkAttendedYes: () => void;
};

export function EventSummaryCard({
  eventId,
  event,
  totals,
  rowsCount,
  saving,
  onBulkMarkAttendedYes,
}: {
  eventId: string;
  event: EventInfo;
  totals: Totals;
  rowsCount: number;
  saving: string;
  onBulkMarkAttendedYes: () => void;
}) {
  return (
    <Card className="mb-2">
      <CardContent className="pt-2 pb-1 px-2">
        <div>
          <div className="flex items-center justify-between mb-1">
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                {event.title}
                <Badge variant="outline" className="text-xs font-normal">{event.event_type}</Badge>
                {event.group && <Badge variant="outline" className="text-xs font-normal">{event.group}</Badge>}
              </h2>
              <div className="text-xs text-muted-foreground">
                {event.starts_at && <span>{new Date(event.starts_at).toLocaleString()}</span>}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">£{event.fee}</Badge>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1 mb-1">
            <div className="bg-muted/50 rounded p-1 flex flex-col items-center">
              <span className="text-xs text-muted-foreground">Attending</span>
              <span className="font-bold text-base">{totals.yesCount}</span>
            </div>
            <div className="bg-muted/50 rounded p-1 flex flex-col items-center">
              <span className="text-xs text-muted-foreground">Expected</span>
              <span className="font-bold text-base">£{totals.expectedSum.toFixed(2)}</span>
            </div>
            <div className="bg-muted/50 rounded p-1 flex flex-col items-center">
              <span className="text-xs text-muted-foreground">Confirmed</span>
              <span className="font-bold text-base">£{totals.paidConfirmedSum.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between mb-1 text-xs">
            <span>Pending: <span className="font-bold">£{totals.pendingSum.toFixed(2)}</span></span>
            <span>
              <Badge className="bg-green-100 text-green-700 border-green-200 mr-1 text-xs">{totals.paidCount} Paid</Badge>
              <Badge className="bg-blue-100 text-blue-700 border-blue-200 mr-1 text-xs">{totals.pendingCount} Pending</Badge>
              <Badge className="bg-red-100 text-red-700 border-red-200 mr-1 text-xs">{totals.rejectedCount} Rejected</Badge>
              <Badge variant="outline" className="text-xs">{totals.unpaidCount} Unpaid</Badge>
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 mb-1">
            <Button
              size="sm"
              className="w-full text-xs py-1"
              disabled={saving === "bulk" || rowsCount === 0}
              onClick={onBulkMarkAttendedYes}
            >
              {saving === "bulk" ? (
                <span>Marking...</span>
              ) : (
                <span>Mark All Attended</span>
              )}
            </Button>
          </div>

          <div className="text-xs text-muted-foreground bg-muted/50 rounded p-1">
            Tip: Bulk mark attended first, then adjust exceptions individually below.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

