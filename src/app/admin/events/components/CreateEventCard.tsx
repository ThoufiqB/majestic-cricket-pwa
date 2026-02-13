"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Calendar, Users, Banknote, Type, Clock, Eye, ChevronDown } from "lucide-react";
import { EVENT_TYPE_LABEL, EVENT_TYPE_OPTIONS, KIDS_EVENT_TYPE_OPTIONS, ALL_GROUPS } from "../constants";

type Props = {
  eventType: string;
  setEventType: (v: string) => void;
  targetGroups: string[];
  setTargetGroups: (v: string[]) => void;
  createKidsEvent: boolean;
  setCreateKidsEvent: (v: boolean) => void;
  isMembership: boolean;
  dateStr: string;
  setDateStr: (v: string) => void;
  hour12: number;
  setHour12: (v: number) => void;
  minute: number;
  setMinute: (v: number) => void;
  ampm: "AM" | "PM";
  setAmpm: (v: "AM" | "PM") => void;
  membershipYear: number;
  setMembershipYear: (v: number) => void;
  yearOptions: number[];
  fee: number;
  setFee: (v: number) => void;
  banner: string;
  setBanner: (v: string) => void;
  setBannerTouched: (v: boolean) => void;
  startIsoFromDateAndTime: (dateStr: string, hour12: number, minute: number, ampm: "AM" | "PM") => string;
  createEvent: () => void;
  hideKidsEventCheckbox?: boolean;
  isKidsEventPage?: boolean;
};

export function CreateEventCard(p: Props) {
  const eventOptions = p.isKidsEventPage ? KIDS_EVENT_TYPE_OPTIONS : EVENT_TYPE_OPTIONS;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Plus className="h-5 w-5 text-primary" />
          Create Event
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 p-2 sm:p-4">
        {/* Event Type */}
        <div className="space-y-1.5">
          <Label className="flex items-center gap-2 text-sm">
            <Type className="h-4 w-4 text-muted-foreground" />
            Event Type
          </Label>
          <Select
            value={p.eventType}
            onValueChange={(v) => {
              p.setEventType(v);
              p.setBannerTouched(false);
            }}
          >
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder="Select event type" />
            </SelectTrigger>
            <SelectContent>
              {eventOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Group (only for adult events) */}
        {!p.isKidsEventPage && (
          <div className="space-y-1.5">
            <Label className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              Target Groups *
            </Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-9">
                  <span className="flex flex-wrap gap-1">
                    {p.targetGroups.length === 0 ? (
                      <span className="text-muted-foreground">Select groups...</span>
                    ) : (
                      p.targetGroups.map((group) => (
                        <Badge key={group} variant="secondary" className="text-xs">
                          {group}
                        </Badge>
                      ))
                    )}
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-full p-2">
                <div className="space-y-2">
                  {ALL_GROUPS.map((group) => (
                    <div key={group} className="flex items-center space-x-2">
                      <Checkbox
                        id={`event-group-${group}`}
                        checked={p.targetGroups.includes(group)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            p.setTargetGroups([...p.targetGroups, group]);
                          } else {
                            p.setTargetGroups(p.targetGroups.filter((g) => g !== group));
                          }
                        }}
                      />
                      <label
                        htmlFor={`event-group-${group}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {group}
                      </label>
                    </div>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            <p className="text-xs text-muted-foreground">
              Select multiple groups to make this event visible to them.
            </p>
          </div>
        )}

        {/* Date/Time or Year (for membership) */}
        {p.isMembership ? (
          <div className="space-y-1.5">
            <Label className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Membership Year
            </Label>
            <Select
              value={String(p.membershipYear)}
              onValueChange={(v) => {
                p.setMembershipYear(Number(v));
                p.setBannerTouched(false);
              }}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {p.yearOptions.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Membership Fee doesn't use a date/time — it's yearly.
            </p>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
            {/* Date */}
            <div className="space-y-1.5 flex-1">
              <Label className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Date
              </Label>
              <Input
                type="date"
                className="h-9 [color-scheme:light] dark:[color-scheme:dark]"
                placeholder="Select date"
                required
                value={p.dateStr}
                onChange={(e) => {
                  p.setDateStr(e.target.value);
                  p.setBannerTouched(false);
                }}
              />
            </div>
            {/* Time */}
            <div className="space-y-1.5 flex-1 w-full">
              <Label className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Time
              </Label>
              <div className="flex gap-1">
                <Select
                  value={String(p.hour12)}
                  onValueChange={(v) => p.setHour12(Number(v))}
                >
                  <SelectTrigger className="h-9 flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map((h) => (
                      <SelectItem key={h} value={String(h)}>
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={String(p.minute)}
                  onValueChange={(v) => p.setMinute(Number(v))}
                >
                  <SelectTrigger className="h-9 flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[0,15,30,45].map((m) => (
                      <SelectItem key={m} value={String(m)}>
                        {String(m).padStart(2,"0")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={p.ampm}
                  onValueChange={(v) => p.setAmpm(v as "AM" | "PM")}
                >
                  <SelectTrigger className="h-9 flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AM">AM</SelectItem>
                    <SelectItem value="PM">PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Fee */}
        <div className="space-y-1.5">
          <Label className="flex items-center gap-2 text-sm">
            <Banknote className="h-4 w-4 text-muted-foreground" />
            Fee (£)
          </Label>
          <Input
            type="number"
            className="h-9"
            value={p.fee}
            onChange={(e) => p.setFee(Number(e.target.value))}
            min="0"
            step="0.01"
            placeholder="0.00"
          />
        </div>

        {/* Event Banner */}
        <div className="space-y-1.5">
          <Label className="flex items-center gap-2 text-sm">
            <Type className="h-4 w-4 text-muted-foreground" />
            Event Banner / Title
          </Label>
          <Input
            className="h-9"
            value={p.banner}
            onChange={(e) => {
              p.setBanner(e.target.value);
              p.setBannerTouched(true);
            }}
            placeholder="Event name (auto-filled)"
          />
          <p className="text-xs text-muted-foreground">
            Auto‑filled from Type + {p.isMembership ? "Year" : "Date"}.
          </p>
        </div>

        {/* Create Button */}
        <Button className="w-full" onClick={p.createEvent}>
          <Plus className="h-4 w-4 mr-2" />
          Create Event
        </Button>
      </CardContent>
    </Card>
  );
}
