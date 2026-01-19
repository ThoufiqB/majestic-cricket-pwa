"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CalendarDays } from "lucide-react";
import type { FriendsGoing, HomeEvent } from "../types";
import { monthLabelFromKey } from "../helpers";
import { EventCard } from "./EventCard";

type Props = {
  events: HomeEvent[];

  isMembershipMode: boolean;
  selectedYear: number;
  selectedMonth: string;

  friendsCache: Record<string, FriendsGoing>;
  onOpenFriends: (eventId: string) => void;

  onMarkAttending: (eventId: string, attending: "YES" | "NO") => void;
  onMarkPaid: (ev: HomeEvent) => void;

  activeProfileId?: string;
  me?: any;
  isKidProfile?: boolean;
};

export function EventListCard(p: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Events
          </CardTitle>
          <CardDescription>
            {p.isMembershipMode ? String(p.selectedYear) : monthLabelFromKey(p.selectedMonth)}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {p.events.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No events found for this selection.
          </p>
        ) : (
          <div className="space-y-4">
            {p.events.map((ev) => {
              const fg = p.friendsCache[ev.event_id];
              const isKidsEvent = ev.kids_event === true;
              const friendsSummary = fg && !isKidsEvent 
                ? { men: { yes: fg.men?.yes || 0, total: fg.men?.total || 0 }, women: { yes: fg.women?.yes || 0, total: fg.women?.total || 0 } } 
                : undefined;

              return (
                <EventCard
                  key={ev.event_id}
                  ev={ev}
                  selectedYear={p.selectedYear}
                  friendsSummary={friendsSummary}
                  onOpenFriends={() => p.onOpenFriends(ev.event_id)}
                  onMarkAttendingYes={() => p.onMarkAttending(ev.event_id, "YES")}
                  onMarkAttendingNo={() => p.onMarkAttending(ev.event_id, "NO")}
                  onMarkPaid={() => p.onMarkPaid(ev)}
                  isKidProfile={p.isKidProfile}
                  kidBirthDate={p.isKidProfile && p.me?.kids_profiles ? p.me.kids_profiles.find((k: any) => k.kid_id === p.activeProfileId)?.date_of_birth : null}
                />
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
