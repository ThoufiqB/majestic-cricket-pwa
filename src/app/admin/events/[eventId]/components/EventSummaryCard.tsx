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
          {/* Header: Title, Type, Group, Date, Price */}
          <div className="flex flex-wrap items-center justify-between mb-2 gap-2">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold">{event.title}</h2>
                <Badge variant="outline" className="text-xs font-normal">{event.event_type}</Badge>
                {event.group && <Badge variant="outline" className="text-xs font-normal">{event.group}</Badge>}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {event.starts_at && <span>{new Date(event.starts_at).toLocaleString()}</span>}
                <Badge className="bg-green-100 text-green-700 border-green-200 text-xs px-2 py-0.5">£{event.fee}</Badge>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="flex flex-row items-center justify-start gap-6 mb-2">
            <div className="flex flex-col items-start">
              <span className="text-xs text-muted-foreground">Attending</span>
              <span className="font-bold text-base">{totals.yesCount}</span>
            </div>
            <div className="flex flex-col items-start">
              <span className="text-xs text-muted-foreground">Expected</span>
              <span className="font-bold text-base">£{totals.expectedSum.toFixed(2)}</span>
            </div>
            <div className="flex flex-col items-start">
              <span className="text-xs text-muted-foreground">Confirmed</span>
              <span className="font-bold text-base">£{totals.paidConfirmedSum.toFixed(2)}</span>
            </div>
            <div className="flex flex-col items-start">
              <span className="text-xs text-muted-foreground">Pending</span>
              <span className="font-bold text-base">£{totals.pendingSum.toFixed(2)}</span>
            </div>
          </div>

          {/* Status Badges Row */}
          <div className="flex flex-row items-center gap-2 mb-2 text-xs">
            <Badge className="bg-green-100 text-green-700 border-green-200 px-2 py-0.5">{totals.paidCount} Paid</Badge>
            <Badge className="bg-blue-100 text-blue-700 border-blue-200 px-2 py-0.5">{totals.pendingCount} Pending</Badge>
            <Badge className="bg-red-100 text-red-700 border-red-200 px-2 py-0.5">{totals.rejectedCount} Rejected</Badge>
            <Badge variant="outline" className="text-xs px-2 py-0.5">{totals.unpaidCount} Unpaid</Badge>
          </div>

          {/* Action Button Row */}
          <div className="flex justify-end mb-1">
            <Button
              size="sm"
              variant="outline"
              className="text-xs px-3 py-1"
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
        </div>
      </CardContent>
    </Card>
  );
}

