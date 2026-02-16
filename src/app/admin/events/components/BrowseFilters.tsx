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
  browseGroup: "all" | "men" | "women" | "u-13" | "u-15" | "u-18";
  setBrowseGroup: (v: "all" | "men" | "women" | "u-13" | "u-15" | "u-18") => void;
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

  // Determine which filters to show
  const filterLabels = [
    { key: 'month', label: 'Month', show: true },
    { key: 'view', label: 'View', show: true },
    { key: 'group', label: 'Group', show: !p.hideGroup },
    { key: 'eventType', label: 'Event Type', show: !!p.showEventType && !!p.setEventType },
  ].filter(f => f.show);

  return (
    <div className="mt-2 w-full">
      {/* Row 1: Headings */}
      <div className={`flex flex-row gap-1 w-full mb-1`}> 
        {filterLabels.map(f => (
          <div key={f.key} className="flex-1 min-w-0 text-center">
            <Label className="text-[11px] font-medium text-muted-foreground p-0 m-0">{f.label}</Label>
          </div>
        ))}
      </div>

      {/* Row 2: Filters */}
      <div className="flex flex-row gap-1 w-full">
        {/* Month Filter */}
        {filterLabels.find(f => f.key === 'month') && (
          <div className="flex-1 min-w-0">
            <Select value={p.browseMonth} onValueChange={p.setBrowseMonth}>
              <SelectTrigger className="h-7 text-xs px-2 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {p.monthOptions.map((m) => (
                  <SelectItem key={m.key} value={m.key} className="text-xs">
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {/* View Filter */}
        {filterLabels.find(f => f.key === 'view') && (
          <div className="flex-1 min-w-0">
            <Select value={p.browseView} onValueChange={(v) => p.setBrowseView(v as "scheduled" | "past" | "all")}> 
              <SelectTrigger className="h-7 text-xs px-2 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scheduled" className="text-xs">Scheduled</SelectItem>
                <SelectItem value="past" className="text-xs">Past</SelectItem>
                <SelectItem value="all" className="text-xs">All Events</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        {/* Group Filter */}
        {filterLabels.find(f => f.key === 'group') && (
          <div className="flex-1 min-w-0">
            <Select
              value={p.browseGroup}
              onValueChange={(v) => p.setBrowseGroup(v as "all" | "men" | "women" | "u-13" | "u-15" | "u-18")}
            >
              <SelectTrigger className="h-7 text-xs px-2 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Groups</SelectItem>
                <SelectItem value="men" className="text-xs">Men</SelectItem>
                <SelectItem value="women" className="text-xs">Women</SelectItem>
                <SelectItem value="u-13" className="text-xs">U-13</SelectItem>
                <SelectItem value="u-15" className="text-xs">U-15</SelectItem>
                <SelectItem value="u-18" className="text-xs">U-18</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        {/* Event Type Filter */}
        {filterLabels.find(f => f.key === 'eventType') && (
          <div className="flex-1 min-w-0">
            <Select value={p.eventType || "all"} onValueChange={p.setEventType!}>
              <SelectTrigger className="h-7 text-xs px-2 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Types</SelectItem>
                {KIDS_EVENT_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}
