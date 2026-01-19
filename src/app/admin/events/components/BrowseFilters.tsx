"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarDays, Users, Eye, Tag } from "lucide-react";
import { KIDS_EVENT_TYPE_OPTIONS } from "../constants";

type MonthOption = { key: string; label: string };

type Props = {
  monthOptions: MonthOption[];
  browseMonth: string;
  setBrowseMonth: (v: string) => void;

  browseGroup: "all" | "men" | "women" | "mixed";
  setBrowseGroup: (v: "all" | "men" | "women" | "mixed") => void;

  browseView: "scheduled" | "past" | "all";
  setBrowseView: (v: "scheduled" | "past" | "all") => void;

  hideGroup?: boolean;

  // Kids event type filter
  eventType?: string;
  setEventType?: (v: string) => void;
  showEventType?: boolean;
};

export function BrowseFilters(p: Props) {
  // Calculate grid columns: Month + View = 2, + Group or EventType = 3
  const hasThirdFilter = !p.hideGroup || p.showEventType;
  const gridCols = hasThirdFilter ? "grid-cols-3" : "grid-cols-2";

  return (
    <div className={`mt-3 grid ${gridCols} gap-3`}>
      {/* Month Filter */}
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" />
          Month
        </Label>
        <Select value={p.browseMonth} onValueChange={p.setBrowseMonth}>
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {p.monthOptions.map((m) => (
              <SelectItem key={m.key} value={m.key}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Group Filter (for adults) */}
      {!p.hideGroup && (
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            Group
          </Label>
          <Select
            value={p.browseGroup}
            onValueChange={(v) => p.setBrowseGroup(v as "all" | "men" | "women" | "mixed")}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Groups</SelectItem>
              <SelectItem value="men">Men</SelectItem>
              <SelectItem value="women">Women</SelectItem>
              <SelectItem value="mixed">Mixed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Event Type Filter (for kids) */}
      {p.showEventType && p.setEventType && (
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Tag className="h-3.5 w-3.5" />
            Event Type
          </Label>
          <Select
            value={p.eventType || "all"}
            onValueChange={p.setEventType}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {KIDS_EVENT_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* View Filter */}
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Eye className="h-3.5 w-3.5" />
          View
        </Label>
        <Select
          value={p.browseView}
          onValueChange={(v) => p.setBrowseView(v as "scheduled" | "past" | "all")}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="past">Past</SelectItem>
            <SelectItem value="all">All Events</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
