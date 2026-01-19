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
  Lightbulb,
  Baby
} from "lucide-react";
import { EVENT_TYPE_LABEL } from "../constants";
import type { EventInfo, Totals } from "../types";
import { money } from "../helpers";

type Props = {
  eventId: string;
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
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-xl flex items-center gap-2">
              <Baby className="h-5 w-5 text-accent" />
              {p.event.title}
            </CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(p.event.starts_at).toLocaleString()}
              </span>
            </CardDescription>
          </div>
          <Badge className="bg-accent text-accent-foreground">
            £{money(p.event.fee)}
          </Badge>
        </div>
        
        {/* Event Type Badge */}
        <div className="flex flex-wrap gap-2 pt-2">
          <Badge variant="secondary">
            {EVENT_TYPE_LABEL[p.event.event_type] || p.event.event_type}
          </Badge>
          <Badge variant="outline" className="bg-accent/10 text-accent border-accent/30">
            Kids Event
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-accent/10 border-accent/20">
            <CardContent className="pt-3 pb-3 text-center">
              <Users className="h-5 w-5 mx-auto text-accent mb-1" />
              <p className="text-xs text-muted-foreground">Attending</p>
              <p className="text-xl font-bold text-accent">{p.totals.yesCount}</p>
            </CardContent>
          </Card>

          <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
            <CardContent className="pt-3 pb-3 text-center">
              <Banknote className="h-5 w-5 mx-auto text-amber-600 mb-1" />
              <p className="text-xs text-muted-foreground">Expected</p>
              <p className="text-xl font-bold text-amber-600">£{money(p.totals.expectedSum)}</p>
            </CardContent>
          </Card>

          <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
            <CardContent className="pt-3 pb-3 text-center">
              <CreditCard className="h-5 w-5 mx-auto text-green-600 mb-1" />
              <p className="text-xs text-muted-foreground">Confirmed</p>
              <p className="text-xl font-bold text-green-600">£{money(p.totals.paidConfirmedSum)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Payment Status Summary */}
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-blue-500" />
            <span className="text-muted-foreground">Pending:</span>
            <span className="font-semibold">£{money(p.totals.pendingSum)}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span>
            <Badge variant="outline" className="mr-1 bg-green-50 text-green-700 border-green-200">
              {p.totals.paidCount}
            </Badge>
            Paid
          </span>
          <span>
            <Badge variant="outline" className="mr-1 bg-blue-50 text-blue-700 border-blue-200">
              {p.totals.pendingCount}
            </Badge>
            Pending
          </span>
          <span>
            <Badge variant="outline" className="mr-1 bg-red-50 text-red-700 border-red-200">
              {p.totals.rejectedCount}
            </Badge>
            Rejected
          </span>
          <span>
            <Badge variant="outline" className="mr-1">
              {p.totals.unpaidCount}
            </Badge>
            Unpaid
          </span>
        </div>

        {/* Bulk Action */}
        <Button
          className="w-full bg-accent hover:bg-accent/90"
          disabled={p.saving === "bulk" || p.rowsCount === 0}
          onClick={p.onBulkMarkAttendedYes}
        >
          {p.saving === "bulk" ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Updating...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Mark All Attended
            </>
          )}
        </Button>

        {/* Tip */}
        <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
          <Lightbulb className="h-4 w-4 shrink-0 text-amber-500" />
          <p>Tip: Bulk mark attended first, then adjust exceptions individually below.</p>
        </div>
      </CardContent>
    </Card>
  );
}
