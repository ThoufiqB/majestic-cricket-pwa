"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Users, Filter } from "lucide-react";

type MonthOption = { key: string; label: string };

type Props = {
  isMembershipMode: boolean;

  selectedMonth: string;
  setSelectedMonth: (v: string) => void;

  selectedYear: number;
  setSelectedYear: (v: number) => void;

  yearOptions: number[];
  monthOptions: MonthOption[];

  isAdmin: boolean;
  me: any;

  selectedGroup: "men" | "women";
  setSelectedGroup: (v: "men" | "women") => void;

  selectedType: "all" | "net_practice" | "league_match" | "family_event" | "membership_fee";
  setSelectedType: (v: any) => void;

  activeProfileId?: string;
  isKidProfile?: boolean;
};

const EVENT_TYPE_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "net_practice", label: "Net Practice" },
  { value: "league_match", label: "League Match" },
  { value: "family_event", label: "Family Event" },
  { value: "membership_fee", label: "Membership" },
];

export function BrowseControlsCard(p: Props) {
  const isKid = p.isKidProfile;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Browse Events
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className={`grid gap-3 ${isKid ? "grid-cols-1" : "grid-cols-3"}`}>
          {/* Month/Year Selector */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              {p.isMembershipMode ? "Year" : "Month"}
            </label>
            {p.isMembershipMode ? (
              <Select
                value={String(p.selectedYear)}
                onValueChange={(v) => p.setSelectedYear(Number(v))}
              >
                <SelectTrigger>
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
            ) : (
              <Select
                value={p.selectedMonth}
                onValueChange={p.setSelectedMonth}
              >
                <SelectTrigger>
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
            )}
          </div>

          {/* Hide group selector for kids */}
          {!isKid && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                Group
              </label>
              <Select
                value={p.isAdmin ? p.selectedGroup : String(p.me?.group || p.selectedGroup)}
                onValueChange={(v) => p.setSelectedGroup(v as "men" | "women")}
                disabled={!p.isAdmin}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="men">Men</SelectItem>
                  <SelectItem value="women">Women</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Hide type selector for kids */}
          {!isKid && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                Type
              </label>
              <Select
                value={p.selectedType}
                onValueChange={(v) => p.setSelectedType(v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {isKid && (
          <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
            👦 Showing all kids events
          </Badge>
        )}

        {!p.isAdmin && !isKid && (
          <p className="text-xs text-muted-foreground">
            Group is locked to your profile.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
