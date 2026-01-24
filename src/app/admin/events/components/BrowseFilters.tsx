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
  eventType?: string;
  setEventType?: (v: string) => void;
  showEventType?: boolean;
};

export function BrowseFilters(p: Props) {
  const hasThirdFilter = !p.hideGroup || p.showEventType;
  const gridBase = "grid grid-cols-1 gap-3";
  const gridResponsive = hasThirdFilter ? "sm:grid-cols-2 md:grid-cols-3" : "sm:grid-cols-2";
  const gridClass = `${gridBase} ${gridResponsive}`;

  return (
    <div className={`mt-3 ${gridClass}`}>
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" />
          Month
        </Label>
        <Select value={p.browseMonth} onValueChange={p.setBrowseMonth}>
          <SelectTrigger className="h-9 w-full">
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
            <SelectTrigger className="h-9 w-full">
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

      {p.showEventType && p.setEventType && (
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Tag className="h-3.5 w-3.5" />
            Event Type
          </Label>
          <Select value={p.eventType || "all"} onValueChange={p.setEventType}>
            <SelectTrigger className="h-9 w-full">
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

      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Eye className="h-3.5 w-3.5" />
          View
        </Label>
        <Select
          value={p.browseView}
          onValueChange={(v) => p.setBrowseView(v as "scheduled" | "past" | "all")}
        >
          <SelectTrigger className="h-9 w-full">
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
