"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Plus, Calendar, Users, Banknote, Type, Clock, Eye } from "lucide-react";
import { EVENT_TYPE_LABEL, EVENT_TYPE_OPTIONS, KIDS_EVENT_TYPE_OPTIONS } from "../constants";

type Props = {
  eventType: string;
  setEventType: (v: string) => void;

  createGroup: "men" | "women" | "mixed";
  setCreateGroup: (v: "men" | "women" | "mixed") => void;

  createKidsEvent: boolean;
  setCreateKidsEvent: (v: boolean) => void;

  isMembership: boolean;

  // normal event
  dateStr: string;
  setDateStr: (v: string) => void;
  hour12: number;
  setHour12: (v: number) => void;
  minute: number;
  setMinute: (v: number) => void;
  ampm: "AM" | "PM";
  setAmpm: (v: "AM" | "PM") => void;

  // membership
  membershipYear: number;
  setMembershipYear: (v: number) => void;
  yearOptions: number[];

  // common
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
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Plus className="h-5 w-5 text-primary" />
          Create Event
        </CardTitle>
        <CardDescription className="text-xs">
          {p.isKidsEventPage 
            ? "Create a new kids event with age groups"
            : "Create a new adult event for the club"
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
              Group
            </Label>
            <Select
              value={p.createGroup}
              onValueChange={(v) => p.setCreateGroup(v as "men" | "women" | "mixed")}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="men">Men</SelectItem>
                <SelectItem value="women">Women</SelectItem>
                <SelectItem value="mixed">Mixed</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Mixed events visible to both men and women.
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
          <div className="flex gap-3 items-end">
            {/* Date */}
            <div className="space-y-1.5 w-[270px]">
              <Label className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Date
              </Label>
              <Input
                type="date"
                className="h-9"
                placeholder="Date"
                value={p.dateStr}
                onChange={(e) => {
                  p.setDateStr(e.target.value);
                  p.setBannerTouched(false);
                }}
              />
            </div>

            {/* Time */}
            <div className="space-y-1.5 flex-1">
              <Label className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Time
              </Label>
              <div className="flex gap-1">
                <Select value={String(p.hour12)} onValueChange={(v) => p.setHour12(Number(v))}>
                  <SelectTrigger className="h-9 w-[75px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((h) => (
                      <SelectItem key={h} value={String(h)}>
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={String(p.minute)} onValueChange={(v) => p.setMinute(Number(v))}>
                  <SelectTrigger className="h-9 w-[75px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[0, 15, 30, 45].map((m) => (
                      <SelectItem key={m} value={String(m)}>
                        {String(m).padStart(2, "0")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={p.ampm} onValueChange={(v) => p.setAmpm(v as "AM" | "PM")}>
                  <SelectTrigger className="h-9 w-[75px]">
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
            Auto-filled from Type + {p.isMembership ? "Year" : "Date"}.
          </p>
        </div>

        {/* Event Preview */}
        <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
          <CardContent className="py-3 space-y-2">
            <div className="flex items-center gap-2">
              <Eye className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] font-semibold text-primary uppercase tracking-wide">
                Preview
              </span>
            </div>
            
            <h3 className="text-base font-bold leading-tight">{p.banner || "—"}</h3>
            
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {EVENT_TYPE_LABEL[p.eventType] || p.eventType}
              </Badge>
              <Badge variant="outline" className="capitalize text-[10px] px-1.5 py-0">
                {p.hideKidsEventCheckbox ? "Kids" : p.createGroup}
              </Badge>
              <Badge className="bg-accent text-accent-foreground text-[10px] px-1.5 py-0">
                £{Number(p.fee || 0).toFixed(2)}
              </Badge>
            </div>

            <p className="text-xs text-muted-foreground">
              📅{" "}
              {p.isMembership
                ? `Year ${p.membershipYear}`
                : p.dateStr
                ? new Date(p.startIsoFromDateAndTime(p.dateStr, p.hour12, p.minute, p.ampm)).toLocaleString()
                : "Date not set"}
            </p>
          </CardContent>
        </Card>

        {/* Create Button */}
        <Button className="w-full" onClick={p.createEvent}>
          <Plus className="h-4 w-4 mr-2" />
          Create Event
        </Button>
      </CardContent>
    </Card>
  );
}
