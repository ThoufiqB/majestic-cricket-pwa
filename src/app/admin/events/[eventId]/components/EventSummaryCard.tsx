"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  PoundSterling,
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
} from "lucide-react";
import type { EventInfo, Totals } from "../types";

type Props = {
  eventId: string;
  event: EventInfo;
  totals: Totals;
  rowsCount: number;
  saving: string;
  onBulkMarkAttendedYes: () => void;
};

function StatTile({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className={`rounded-xl border px-2 py-2 sm:px-3 min-w-0 break-words flex flex-col items-center justify-center
      ${label === 'Attending' ? 'bg-blue-50' :
        label === 'Expected' ? 'bg-yellow-50' :
        label === 'Confirmed' ? 'bg-green-50' :
        label === 'Pending' ? 'bg-orange-50' :
        'bg-background'}
    `}>
      <div className="text-[11px] text-muted-foreground leading-none text-center">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold leading-none text-center">{value}</div>
    </div>
  );
}

function StatusPill({
  icon,
  text,
  className,
}: {
  icon: React.ReactNode;
  text: string;
  className: string;
}) {
  return (
    <span
      className={`
        inline-flex w-full sm:w-auto items-center justify-center gap-1
        rounded-full border px-2 py-1 text-[11px] leading-none
        ${className}
      `}
    >
      {icon}
      {text}
    </span>
  );
}

export function EventSummaryCard({
  eventId,
  event,
  totals,
  rowsCount,
  saving,
  onBulkMarkAttendedYes,
}: Props) {
  const startsAt = event.starts_at ? new Date(event.starts_at) : null;
  const dateLabel = startsAt
    ? startsAt.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "No start time";
  const fee = Number(event.fee ?? 0);

  return (
    <Card className="mb-2">
      <CardContent className="pt-2 pb-2 px-3 overflow-x-auto">
        <div className="flex flex-col gap-2">
          {/* Group badge top left, then event header: title and price */}
          <div className="flex flex-col w-full min-w-0">
            {event.group ? (
              <Badge variant="secondary" className="text-[11px] font-bold uppercase tracking-wide mt-0">
                {event.group}
              </Badge>
            ) : null}
            <div className="flex flex-col min-w-0 w-full">
              <div className="flex items-center justify-between min-w-0 w-full">
                <h2 className="truncate font-semibold text-base">
                  {event.title}
                </h2>
                <span className="font-bold text-base text-blue-600 whitespace-nowrap">
                  £{fee.toFixed(2)}
                </span>
              </div>
              <span className="text-xs text-muted-foreground font-normal mt-0.5 inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {dateLabel}
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <StatTile
              label="Attending"
              value={
                <span className="inline-flex items-center gap-1 justify-center">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  {totals.yesCount}
                </span>
              }
            />
            <StatTile label="Expected" value={`£${totals.expectedSum.toFixed(2)}`} />
            <StatTile label="Confirmed" value={`£${totals.paidConfirmedSum.toFixed(2)}`} />
            <StatTile label="Pending" value={`£${totals.pendingSum.toFixed(2)}`} />
          </div>

          {/* Status pills */}
          <div className="my-2 flex flex-wrap gap-x-4 gap-y-2 justify-center items-center">
            <div className="flex items-center gap-1 min-w-[70px] justify-center">
              <span className="inline-flex items-center justify-center rounded-full bg-green-50 border border-green-200 text-green-700 font-semibold w-7 h-7 text-xs">{totals.paidCount}</span>
              <span className="text-xs">Paid</span>
            </div>
            <div className="flex items-center gap-1 min-w-[70px] justify-center">
              <span className="inline-flex items-center justify-center rounded-full bg-blue-50 border border-blue-200 text-blue-700 font-semibold w-7 h-7 text-xs">{totals.pendingCount}</span>
              <span className="text-xs">Pending</span>
            </div>
            <div className="flex items-center gap-1 min-w-[70px] justify-center">
              <span className="inline-flex items-center justify-center rounded-full bg-red-50 border border-red-200 text-red-700 font-semibold w-7 h-7 text-xs">{totals.rejectedCount}</span>
              <span className="text-xs">Rejected</span>
            </div>
            <div className="flex items-center gap-1 min-w-[70px] justify-center">
              <span className="inline-flex items-center justify-center rounded-full bg-gray-50 border border-gray-200 text-gray-700 font-semibold w-7 h-7 text-xs">{totals.unpaidCount}</span>
              <span className="text-xs">Unpaid</span>
            </div>
          </div>

          {/* Mark All Attended button below stats and pills */}
          <Button
            size="sm"
            variant="brand"
            className="mt-2 mb-0 w-full"
            disabled={saving === "bulk" || rowsCount === 0}
            onClick={onBulkMarkAttendedYes}
          >
            {saving === "bulk" ? "Marking..." : "Mark All Attended"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
