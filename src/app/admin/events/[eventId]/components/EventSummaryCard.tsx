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
    <div className="rounded-xl border bg-background px-3 py-2">
      <div className="text-[11px] text-muted-foreground leading-none">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold leading-none">{value}</div>
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
        inline-flex w-full items-center justify-center gap-1
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
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="truncate text-base font-semibold">
                {event.title}
              </h2>
              <Badge variant="outline" className="text-[11px] font-normal">
                {event.event_type}
              </Badge>
              {event.group ? (
                <Badge variant="secondary" className="text-[11px] font-normal">
                  {event.group}
                </Badge>
              ) : null}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {dateLabel}
              </span>
              <span className="inline-flex items-center gap-1">
                <PoundSterling className="h-3.5 w-3.5" />
                <span className="font-medium text-foreground">
                  £{fee.toFixed(2)}
                </span>
              </span>
            </div>
          </div>
          <Button
            size="sm"
            variant="brand"
            className="shrink-0"
            disabled={saving === "bulk" || rowsCount === 0}
            onClick={onBulkMarkAttendedYes}
          >
            {saving === "bulk" ? "Marking..." : "Mark all attended"}
          </Button>
        </div>

        {/* Stats */}
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatTile
            label="Attending"
            value={
              <span className="inline-flex items-center gap-1">
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
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatusPill
            icon={<CheckCircle2 className="h-3.5 w-3.5" />}
            text={`${totals.paidCount} paid`}
            className="bg-green-50 text-green-700 border-green-200"
          />
          <StatusPill
            icon={<Clock className="h-3.5 w-3.5" />}
            text={`${totals.pendingCount} pending`}
            className="bg-blue-50 text-blue-700 border-blue-200"
          />
          <StatusPill
            icon={<XCircle className="h-3.5 w-3.5" />}
            text={`${totals.rejectedCount} rejected`}
            className="bg-red-50 text-red-700 border-red-200"
          />
          <StatusPill
            icon={<AlertCircle className="h-3.5 w-3.5" />}
            text={`${totals.unpaidCount} unpaid`}
            className="bg-muted/40 text-foreground border-border"
          />
        </div>
      </CardContent>
    </Card>
  );
}
