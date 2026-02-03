"use client";

import { useEffect, useState, useMemo } from "react";
import { useProfile } from "@/components/context/ProfileContext";
import { KIDS_EVENT_TYPE_OPTIONS } from "@/app/admin/events/constants";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarDays, MapPin, Clock, Users, Check, X } from "lucide-react";
import type { HomeEvent as HomeEventType, FriendsGoing } from "@/app/home/types";
import { FriendsGoingModal } from "@/app/home/components/FriendsGoingModal";
import { apiGet, apiPost } from "@/app/client/api";
import { toast } from "sonner";

type HomeEvent = HomeEventType & {
  location?: string;
  friendsSummary?: FriendsGoing;
};

function buildMonthOptions(count: number) {
  const options: { value: string; label: string }[] = [];
  const now = new Date();

  for (let i = -1; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    options.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      }),
    });
  }
  return options;
}

function monthKeyFromDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatEventDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatEventTime(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function getEventTypeBadge(type: string) {
  switch (type) {
    case "net_practice":
      return (
        <Badge
          variant="outline"
          className="bg-blue-50 text-blue-700 border-blue-200"
        >
          Net Practice
        </Badge>
      );
    case "league_match":
      return (
        <Badge
          variant="outline"
          className="bg-green-50 text-green-700 border-green-200"
        >
          Match
        </Badge>
      );
    case "family_event":
      return (
        <Badge
          variant="outline"
          className="bg-purple-50 text-purple-700 border-purple-200"
        >
          Family Event
        </Badge>
      );
    default:
      return <Badge variant="outline">{type}</Badge>;
  }
}

function getAttendingBadge(attending: string | undefined, isPast: boolean) {
  if (isPast) {
    if (attending === "YES") {
      return <Badge className="bg-green-100 text-green-800">Attended</Badge>;
    }
    if (attending === "NO") {
      return <Badge className="bg-red-100 text-red-700">Missed</Badge>;
    }
    return null;
  }

  if (attending === "YES") {
    return <Badge className="bg-green-100 text-green-800">Going</Badge>;
  }
  if (attending === "NO") {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        Not Going
      </Badge>
    );
  }
  return null;
}

export default function BrowsePage() {
  const [events, setEvents] = useState<HomeEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<any>(null);
  const { activeProfileId, isKidProfile } = useProfile();
  const [selectedMonth, setSelectedMonth] = useState(
    monthKeyFromDate(new Date())
  );
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedAttendance, setSelectedAttendance] = useState<string>("all");
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [openFriendsEventId, setOpenFriendsEventId] = useState<string | null>(
    null
  );

  const monthOptions = useMemo(
    () => buildMonthOptions(7),
    []
  ) as { value: string; label: string }[];

  const eventTypeOptions = isKidProfile
    ? [{ value: "all", label: "All" }, ...KIDS_EVENT_TYPE_OPTIONS]
    : [
        { value: "all", label: "All" },
        { value: "net_practice", label: "Net Practice" },
        { value: "league_match", label: "Match" },
        { value: "family_event", label: "Family Event" },
      ];

  const attendanceOptions = [
    { value: "all", label: "All" },
    { value: "attended", label: "Attended" },
    { value: "missed", label: "Missed" },
  ];

  const filteredEvents = useMemo(() => {
    let filtered = events;

    if (selectedType !== "all") {
      filtered = filtered.filter((ev) => ev.event_type === selectedType);
    }

    if (selectedAttendance === "attended") {
      filtered = filtered.filter((ev) => ev.my?.attending === "YES");
    } else if (selectedAttendance === "missed") {
      filtered = filtered.filter(
        (ev) =>
          ev.my?.attending === "NO" ||
          ev.my?.attending === "UNKNOWN" ||
          !ev.my?.attending
      );
    }

    return filtered;
  }, [events, selectedType, selectedAttendance]);

  useEffect(() => {
    async function loadMe() {
      try {
        const data = await apiGet("/api/me");
        setMe(data);
      } catch {
        // Not logged in
      }
    }
    loadMe();
  }, []);

  useEffect(() => {
    async function loadEvents() {
      if (!me || !activeProfileId) return;

      const isKid = activeProfileId !== me.player_id;
      setLoading(true);

      try {
        const q = new URLSearchParams();
        q.set("month", selectedMonth);
        if (isKid) q.set("group", "all_kids");

        const data = await apiGet(`/api/events?${q.toString()}`);
        setEvents(data.events || []);
      } catch (error) {
        console.error("Failed to load events:", error);
        toast.error("Failed to load events");
      } finally {
        setLoading(false);
      }
    }

    loadEvents();
  }, [selectedMonth, me, activeProfileId]);

  // isKidProfile now comes from useProfile()

  async function markAttending(eventId: string, attending: "YES" | "NO") {
    if (!me) return;

    setMarkingId(eventId);
    try {
      if (isKidProfile && activeProfileId) {
        await apiPost(`/api/kids/${activeProfileId}/attendance`, {
          event_id: eventId,
          attending,
        });
      } else {
        await apiPost(`/api/events/${eventId}/attending`, { attending });
      }

      setEvents((prev) =>
        prev.map((ev) =>
          ev.event_id === eventId
            ? { ...ev, my: { ...ev.my, attending } as any }
            : ev
        )
      );

      toast.success(attending === "YES" ? "Marked as attending!" : "Marked as not attending");
    } catch (error) {
      console.error("Failed to mark attendance:", error);
      toast.error("Failed to update attendance");
    } finally {
      setMarkingId(null);
    }
  }

  // Ensure the return is inside the component function
  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="w-full">
            <div className="flex flex-row gap-1 w-full mb-1">
              <div className="flex-1 min-w-0 text-left">
                <span className="text-[11px] font-medium text-muted-foreground">
                  Month
                </span>
              </div>
              <div className="flex-1 min-w-0 text-left">
                <span className="text-[11px] font-medium text-muted-foreground">
                  Type
                </span>
              </div>
              <div className="flex-1 min-w-0 text-left">
                <span className="text-[11px] font-medium text-muted-foreground">
                  Attendance
                </span>
              </div>
            </div>

            <div className="flex flex-row gap-1 w-full">
              <div className="flex-1 min-w-0">
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="h-7 text-xs px-2 w-full">
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(monthOptions) &&
                      monthOptions.map((opt) => (
                        <SelectItem
                          key={opt.value}
                          value={opt.value}
                          className="text-xs"
                        >
                          {opt.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 min-w-0">
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="h-7 text-xs px-2 w-full">
                    <SelectValue placeholder="Event type" />
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypeOptions.map((opt) => (
                      <SelectItem
                        key={opt.value}
                        value={opt.value}
                        className="text-xs"
                      >
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 min-w-0">
                <Select
                  value={selectedAttendance}
                  onValueChange={setSelectedAttendance}
                >
                  <SelectTrigger className="h-7 text-xs px-2 w-full">
                    <SelectValue placeholder="Attendance" />
                  </SelectTrigger>
                  <SelectContent>
                    {attendanceOptions.map((opt) => (
                      <SelectItem
                        key={opt.value}
                        value={opt.value}
                        className="text-xs"
                      >
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events List */}
      <Card className="flex flex-col" style={{ maxHeight: "calc(100vh - 240px)" }}>
        <CardHeader className="pb-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Events</CardTitle>
            <CardDescription>
              {filteredEvents.length} event{filteredEvents.length !== 1 ? "s" : ""}
              {selectedType !== "all" &&
                ` • ${eventTypeOptions.find((o) => o.value === selectedType)?.label}`}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="p-4 border rounded-lg space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-8">
              <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                {events.length === 0 ? "No events this month" : "No events match your filter"}
              </p>
              {selectedType !== "all" && events.length > 0 && (
                <Button
                  variant="link"
                  onClick={() => setSelectedType("all")}
                  className="mt-1"
                >
                  Show all events
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEvents.map((event) => {
                const isMarking = markingId === event.event_id;
                const myAttending = event.my?.attending;
                const isPast = new Date(event.starts_at) < new Date();

                return (
                  <div
                    key={event.event_id}
                    className="p-3 border rounded-lg hover:bg-muted/50 transition-colors flex flex-row items-start gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold text-base leading-tight truncate text-[#14213d]">
                          {event.title}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <CalendarDays className="h-3.5 w-3.5" />
                        <span>{formatEventDate(event.starts_at)}</span>
                        <Clock className="h-3.5 w-3.5 ml-1" />
                        <span>{formatEventTime(event.starts_at)}</span>
                      </div>

                      {event.location && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                          <MapPin className="h-3.5 w-3.5" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      )}

                      {event.friendsSummary && (
                        <button
                          type="button"
                          className="flex items-center gap-2 text-xs text-blue-700 mb-1 mt-1 hover:underline focus:outline-none"
                          onClick={() => setOpenFriendsEventId(event.event_id)}
                          title="Show Friends Going"
                        >
                          <Users className="h-3.5 w-3.5 mr-1" />
                          {event.kids_event ? (
                            <span>
                              Kids {event.friendsSummary.kids?.yes || 0}/
                              {event.friendsSummary.kids?.total || 0}
                            </span>
                          ) : (
                            <>
                              {(event.group === "men" || event.group === "all") &&
                                event.friendsSummary.men && (
                                  <span>
                                    Men {event.friendsSummary.men.yes}/
                                    {event.friendsSummary.men.total}
                                  </span>
                                )}

                              {event.group === "all" &&
                                event.friendsSummary.men &&
                                event.friendsSummary.women && <span> • </span>}

                              {(event.group === "women" || event.group === "all") &&
                                event.friendsSummary.women && (
                                  <span>
                                    Women {event.friendsSummary.women.yes}/
                                    {event.friendsSummary.women.total}
                                  </span>
                                )}
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-1 min-w-fit pl-2">
                      <div className="flex flex-row items-center gap-1 mb-1">
                        {getAttendingBadge(myAttending, isPast)}
                        {event.fee > 0 && (
                          <Badge className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 border border-blue-200">
                            £{event.fee}
                          </Badge>
                        )}
                      </div>

                      {!isPast && me && (
                        <div className="flex gap-1 mt-1">
                          <Button
                            size="sm"
                            variant={myAttending === "YES" ? "default" : "outline"}
                            className={myAttending === "YES" ? "bg-green-600 hover:bg-green-700" : ""}
                            disabled={isMarking}
                            onClick={() => markAttending(event.event_id, "YES")}
                          >
                            <Check className="h-4 w-4" />
                          </Button>

                          <Button
                            size="sm"
                            variant={myAttending === "NO" ? "default" : "outline"}
                            className={myAttending === "NO" ? "bg-red-600 hover:bg-red-700" : ""}
                            disabled={isMarking}
                            onClick={() => markAttending(event.event_id, "NO")}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <FriendsGoingModal
        openEventId={openFriendsEventId}
        me={me}
        events={events as any}
        modalData={
          openFriendsEventId
            ? (events.find((ev) => ev.event_id === openFriendsEventId)
                ?.friendsSummary as FriendsGoing) || null
            : null
        }
        loading={false}
        err=""
        onClose={() => setOpenFriendsEventId(null)}
      />
    </div>
  );
}
