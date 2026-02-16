"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CalendarDays,
  MapPin,
  Clock,
  ChevronDown,
  User,
  Baby,
  Check,
  X,
  CreditCard,
  ChevronRight,
  ChevronLeft,
  Calendar,
  AlertCircle,
  Users,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { apiGet, apiPost, apiPatch } from "@/app/client/api";
import { signOutSession } from "@/app/auth";
import { toast } from "sonner";
import { useProfile } from "@/components/context/ProfileContext";
import { calculateFee } from "@/lib/calculateFee";

import { AuthGateCard } from "@/app/home/components/AuthGateCard";
import { FriendsGoingModal } from "@/app/home/components/FriendsGoingModal";

type DashboardEvent = {
  event_id: string;
  title: string;
  event_type: string;
  starts_at: string;
  location: string;
  fee: number;
  status: string;
  group?: string;
  targetGroups?: string[];
  kids_event?: boolean;
  friendsSummary?: {
    men?: { yes: number; total: number; people?: { player_id: string; name: string }[] };
    women?: { yes: number; total: number; people?: { player_id: string; name: string }[] };
    kids?: { yes: number; total: number; people?: { kid_id: string; name: string }[] };
    juniors?: { yes: number; total: number; people?: { player_id: string; name: string }[] };
  };
  my: {
    attending: "YES" | "NO" | "UNKNOWN";
    attended: boolean;
    paid_status: "PAID" | "UNPAID" | "PENDING" | "REJECTED";
    fee_due: number | null;
  };
};

type KidProfile = {
  kid_id: string;
  name: string;
  age?: number;
};

function formatEventDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
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
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          Net Practice
        </Badge>
      );
    case "league_match":
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          Match
        </Badge>
      );
    case "family_event":
      return (
        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
          Family Event
        </Badge>
      );
    default:
      return <Badge variant="outline">{type}</Badge>;
  }
}

/**
 * ✅ Net Practice cutoff rule:
 * Attendance allowed only until 48 hours before the start time.
 * After cutoff (but before event starts) user must request participation.
 */
function getNetPracticeCutoffInfo(startsAtIso: string) {
  const startMs = new Date(startsAtIso).getTime();
  const nowMs = Date.now();

  if (!Number.isFinite(startMs)) {
    return { isNetPracticeOpen: true, isAfterCutoffBeforeStart: false };
  }

  const cutoffMs = startMs - 48 * 60 * 60 * 1000;
  const eventPast = startMs <= nowMs;

  const isNetPracticeOpen = nowMs < cutoffMs;
  const isAfterCutoffBeforeStart = nowMs >= cutoffMs && !eventPast;

  return { isNetPracticeOpen, isAfterCutoffBeforeStart };
}

function isAlreadyExistsError(e: any) {
  const msg = String(e?.message || "");
  const payloadErr = String(e?.payload?.error || e?.payload?.message || "");
  return msg.toLowerCase().includes("already exists") || payloadErr.toLowerCase().includes("already exists");
}

export default function PlayerHomePage() {
  // ✅ Single source of truth (NO local duplicate state)
  const {
    activeProfileId,
    setActiveProfileId: setContextProfileId,
    refreshProfile,
    playerId,
    kids: kidsFromContext,
    loading: contextLoading,
  } = useProfile();

  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [nextEvent, setNextEvent] = useState<DashboardEvent | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<DashboardEvent[]>([]); // New: Array of upcoming events
  const [currentEventIndex, setCurrentEventIndex] = useState(0); // New: Track which event to display
  const [lastEvent, setLastEvent] = useState<DashboardEvent | null>(null);
  const [stats, setStats] = useState<{ eventsAttendedThisMonth: number; pendingPayments: number } | null>(null);
  const [profile, setProfile] = useState<{ name: string; group: string; email: string } | null>(null);

  const [markingAttendance, setMarkingAttendance] = useState(false);
  const [markingPayment, setMarkingPayment] = useState(false);
  const [openFriendsEventId, setOpenFriendsEventId] = useState<string | null>(null);

  const [requestingParticipation, setRequestingParticipation] = useState(false);
  const [requestSentForEventId, setRequestSentForEventId] = useState<string | null>(null);
  const [requestStatusLoading, setRequestStatusLoading] = useState(false);

  // Profile setup state
  const [needsProfile, setNeedsProfile] = useState(false);
  const [profileGroup, setProfileGroup] = useState<"" | "men" | "women">("");
  const [profileMemberType, setProfileMemberType] = useState<"" | "standard" | "student">("");
  const [profilePhone, setProfilePhone] = useState<string>("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    // avoid early load before context is ready (prevents flicker/race)
    if (contextLoading) return;
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextLoading, activeProfileId]);

  async function loadData() {
    setLoading(true);
    try {
      const meData = await apiGet("/api/me");
      setMe(meData);

      // Check if profile is complete - support both new (groups array) and legacy (group string)
      const hasGroups = (Array.isArray(meData.groups) && meData.groups.length > 0) || !!meData.group;
      const hasMemberType = !!meData.member_type;
      
      if (!hasGroups || !hasMemberType) {
        setNeedsProfile(true);
        return;
      }

      // ✅ Effective profile = backend truth
      const backendEffectiveProfileId = meData.active_profile_id || meData.player_id;

      // Keep context in sync with backend (refresh-proof)
      if (backendEffectiveProfileId && backendEffectiveProfileId !== activeProfileId) {
        setContextProfileId(backendEffectiveProfileId);
        // Stop here; effect will re-run with synced id and fetch correct dashboard once.
        return;
      }

      const effectiveProfileId = backendEffectiveProfileId;

      const kidId = effectiveProfileId && effectiveProfileId !== meData.player_id ? effectiveProfileId : null;
      const q = kidId ? `?kidId=${encodeURIComponent(kidId)}` : "";
      const dashData = await apiGet(`/api/events/dashboard${q}`);

      const ne: DashboardEvent | null = dashData.nextEvent || null;
      const upcoming: DashboardEvent[] = dashData.upcomingEvents || [];

      setNextEvent(ne);
      setUpcomingEvents(upcoming);
      setCurrentEventIndex(0); // Reset to first event when data loads
      setLastEvent(dashData.lastEvent || null);
      setStats(dashData.stats || null);
      setProfile(dashData.profile || null);

      setRequestSentForEventId(null);
      setRequestStatusLoading(false);

      if (ne?.event_id && ne?.event_type === "net_practice") {
        const attending = ne.my?.attending || "UNKNOWN";
        const isGoing = attending === "YES";

        const { isAfterCutoffBeforeStart } = getNetPracticeCutoffInfo(ne.starts_at);

        const canShowRequestButton =
          isAfterCutoffBeforeStart &&
          !isGoing &&
          (attending === "UNKNOWN" || attending === "NO");

        if (canShowRequestButton) {
          setRequestStatusLoading(true);
          try {
            const kidQuery = kidId ? `?kid_id=${encodeURIComponent(kidId)}` : "";
            const status = await apiGet<{ exists: boolean; status?: string | null }>(
              `/api/events/${encodeURIComponent(ne.event_id)}/request${kidQuery}`
            );
            if (status?.exists) setRequestSentForEventId(ne.event_id);
          } catch (e) {
            console.warn("Failed to check request status:", e);
          } finally {
            setRequestStatusLoading(false);
          }
        }
      }
    } catch (error) {
      console.error("Failed to load dashboard:", error);
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }

  // Navigation functions for event carousel
  function goToNextEvent() {
    if (upcomingEvents.length === 0) return;
    setCurrentEventIndex((prev) => (prev + 1) % upcomingEvents.length);
  }

  function goToPrevEvent() {
    if (upcomingEvents.length === 0) return;
    setCurrentEventIndex((prev) => (prev - 1 + upcomingEvents.length) % upcomingEvents.length);
  }

  function goToEvent(index: number) {
    if (index >= 0 && index < upcomingEvents.length) {
      setCurrentEventIndex(index);
    }
  }

  // Get the currently displayed event
  const displayedEvent = upcomingEvents.length > 0 ? upcomingEvents[currentEventIndex] : nextEvent;
  const hasMultipleEvents = upcomingEvents.length > 1;

  async function signOut() {
    await signOutSession();
    window.location.reload();
  }

  async function saveProfile() {
    if (!profileGroup || !profileMemberType) {
      setMsg("Please select your group and member type");
      return;
    }
    setSavingProfile(true);
    try {
      await apiPatch("/api/profile", {
        group: profileGroup,
        member_type: profileMemberType,
        phone: profilePhone || undefined,
      });
      setNeedsProfile(false);
      await loadData();
    } catch (e) {
      setMsg("Failed to save profile");
      toast.error("Failed to save profile");
    } finally {
      setSavingProfile(false);
    }
  }

  /**
   * ✅ Correct switching using the ONLY supported backend API:
   * PATCH /api/kids/{kidId}/switch-profile with active_profile_id
   *
   * Your route.ts REQUIRES active_profile_id and DOES NOT allow null.
   * So:
   * - switch to kid => active_profile_id = kidId
   * - switch to adult => active_profile_id = playerId (uid)
   */
  async function handleSwitchProfile(profileId: string) {
    try {
      const mePlayerId = me?.player_id;
      if (!mePlayerId) throw new Error("Missing player_id");

      const switchingToAdult = profileId === mePlayerId;
      const targetActiveProfileId = switchingToAdult ? mePlayerId : profileId;

      // Persist on backend (this is what makes refresh work)
      await apiPatch(`/api/kids/${encodeURIComponent(profileId)}/switch-profile`, {
        active_profile_id: targetActiveProfileId,
      });

      // Update context immediately for snappy UI
      setContextProfileId(targetActiveProfileId);

      // Reload context from backend to guarantee sync across the app
      await refreshProfile();

      // Reload dashboard with new effective profile
      await loadData();

      setRequestSentForEventId(null);
      setRequestingParticipation(false);
      setRequestStatusLoading(false);

      toast.success("Switched profile");
    } catch (e) {
      console.error("Failed to switch profile:", e);
      toast.error("Failed to switch profile");
    }
  }

  async function markAttending(eventId: string, attending: "YES" | "NO") {
    setMarkingAttendance(true);
    try {
      const isKid = activeProfileId && activeProfileId !== me?.player_id;

      if (isKid && activeProfileId) {
        await apiPost(`/api/kids/${activeProfileId}/attendance`, {
          event_id: eventId,
          attending,
        });
      } else {
        await apiPost(`/api/events/${eventId}/attending`, { attending });
      }

      toast.success(attending === "YES" ? "Marked as attending!" : "Marked as not attending");
      await loadData();
    } catch (error) {
      console.error("Failed to mark attendance:", error);
      toast.error("Failed to update attendance");
    } finally {
      setMarkingAttendance(false);
    }
  }

  async function requestParticipation(eventId: string) {
    if (requestingParticipation) return;

    setRequestingParticipation(true);
    try {
      const isKid = activeProfileId && activeProfileId !== me?.player_id;

      if (isKid && activeProfileId) {
        await apiPost(`/api/events/${eventId}/request`, { kid_id: activeProfileId });
      } else {
        await apiPost(`/api/events/${eventId}/request`, {});
      }

      toast.success("Request sent to admin ✅");
      setRequestSentForEventId(eventId);
      await loadData();
    } catch (error: any) {
      if (isAlreadyExistsError(error)) {
        toast.info("Request already submitted ✅");
        setRequestSentForEventId(eventId);
        await loadData();
      } else {
        console.warn("Failed to request participation:", error);
        toast.error(error?.message || "Failed to send request");
      }
    } finally {
      setRequestingParticipation(false);
    }
  }

  async function markPaid(eventId: string) {
    setMarkingPayment(true);
    try {
      const isKid = activeProfileId && activeProfileId !== me?.player_id;

      if (isKid && activeProfileId) {
        await apiPost(`/api/kids/${activeProfileId}/paid`, { event_id: eventId, paid_status: "PENDING" });
      } else {
        await apiPost(`/api/events/${eventId}/paid`, { paid_status: "PENDING" });
      }

      toast.success("Payment marked as pending verification");
      await loadData();
    } catch (error) {
      console.error("Failed to mark payment:", error);
      toast.error("Failed to mark payment");
    } finally {
      setMarkingPayment(false);
    }
  }

  if (!me && !loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <AuthGateCard onSignedIn={() => window.location.reload()} />
      </div>
    );
  }

  if (needsProfile && !loading) {
    if (typeof window !== "undefined") {
      window.location.href = "/complete-profile";
    }
    return null;
  }

  const kids: KidProfile[] = (me?.kids_profiles || kidsFromContext || []) as KidProfile[];
  const hasKids = kids.length > 0;
  const isKidProfile = !!(activeProfileId && activeProfileId !== me?.player_id);
  const currentKid = isKidProfile ? kids.find((k) => k.kid_id === activeProfileId) : null;

  const getActiveProfileName = () => {
    if (isKidProfile && currentKid) return currentKid.name;
    return me?.name || "Welcome";
  };

  return (
    <div className="space-y-4">
      {/* Welcome Banner */}
      <Card className="relative overflow-hidden min-h-[54px]">
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage:
              'linear-gradient(to bottom, rgba(30,58,95,0.62) 60%, rgba(45,90,138,0.55) 100%), url(/field.JPG)',
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            backgroundAttachment: "scroll",
            filter: "brightness(0.98)",
          }}
        />
        <CardContent className="relative z-10 pt-1 pb-1">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-white/30 flex items-center justify-center shadow-md">
                {isKidProfile ? <Baby className="h-7 w-7 text-white drop-shadow" /> : <User className="h-7 w-7 text-white drop-shadow" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-white mb-1 drop-shadow">
                    Welcome, {getActiveProfileName()}!
                  </h2>

                  {/* Profile Switch Dropdown removed; use header switcher only */}
                </div>
              </div>
            </div>

            {stats && (
              <div className="flex gap-8 justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white drop-shadow">{stats.eventsAttendedThisMonth}</div>
                  <div className="text-xs text-white/80">Attended</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-300 drop-shadow">{stats.pendingPayments}</div>
                  <div className="text-xs text-white/80">Pending</div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Next Event Card */}
      <Card className="relative">
        {/* Floating Left Chevron */}
        {hasMultipleEvents && (
          <button
            onClick={goToPrevEvent}
            className="absolute -left-5 top-1/2 -translate-y-1/2 z-10 h-11 w-11 rounded-full bg-white/90 backdrop-blur-sm shadow-lg border border-gray-200/50 hover:bg-white hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center justify-center"
            aria-label="Previous event"
          >
            <ChevronLeft className="h-5 w-5 text-primary" />
          </button>
        )}

        {/* Floating Right Chevron */}
        {hasMultipleEvents && (
          <button
            onClick={goToNextEvent}
            className="absolute -right-5 top-1/2 -translate-y-1/2 z-10 h-11 w-11 rounded-full bg-white/90 backdrop-blur-sm shadow-lg border border-gray-200/50 hover:bg-white hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center justify-center"
            aria-label="Next event"
          >
            <ChevronRight className="h-5 w-5 text-primary" />
          </button>
        )}

        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              {hasMultipleEvents 
                ? `Upcoming Events (${currentEventIndex + 1}/${upcomingEvents.length})`
                : "Next Event"
              }
            </CardTitle>
            <Link href="/browse">
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                Browse All <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
          
          {/* Event Indicators (dots) */}
          {hasMultipleEvents && (
            <div className="flex items-center justify-center gap-1.5 mt-3">
              {upcomingEvents.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToEvent(index)}
                  className={`h-2 w-2 rounded-full transition-all ${
                    index === currentEventIndex
                      ? "bg-primary w-6"
                      : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                  }`}
                  aria-label={`Go to event ${index + 1}`}
                />
              ))}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : displayedEvent ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="font-semibold text-lg">{displayedEvent.title}</h3>
                <div>{getEventTypeBadge(displayedEvent.event_type)}</div>
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <CalendarDays className="h-4 w-4" />
                  <span>{formatEventDate(displayedEvent.starts_at)}</span>
                  <span className="mx-1">•</span>
                  <Clock className="h-4 w-4" />
                  <span>{formatEventTime(displayedEvent.starts_at)}</span>
                </div>
                {displayedEvent.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    <span>{displayedEvent.location}</span>
                  </div>
                )}
                {/* Target Groups */}
                {displayedEvent.targetGroups && displayedEvent.targetGroups.length > 0 ? (
                  <div className="flex items-center gap-1 flex-wrap">
                    {displayedEvent.targetGroups.map((grp: string) => (
                      <Badge key={grp} variant="outline" className="text-xs capitalize">
                        {String(grp).toLowerCase()}
                      </Badge>
                    ))}
                  </div>
                ) : displayedEvent.group ? (
                  <div>
                    <Badge variant="outline" className="text-xs capitalize">
                      {String(displayedEvent.group).toLowerCase()}
                    </Badge>
                  </div>
                ) : null}
                {displayedEvent.event_type === "net_practice" && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Attendance closes 48 hours before this net session.
                  </p>
                )}
                {displayedEvent.fee > 0 && (
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-lg font-bold text-primary">
                      £{calculateFee(displayedEvent.fee, me?.member_type)}
                    </span>
                    {me?.member_type === "student" && (
                      <span className="text-xs text-green-600 font-medium">
                        Student rate (25% off)
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                {(() => {
                  const isNetPractice = displayedEvent.event_type === "net_practice";
                  const { isNetPracticeOpen, isAfterCutoffBeforeStart } = isNetPractice
                    ? getNetPracticeCutoffInfo(displayedEvent.starts_at)
                    : { isNetPracticeOpen: true, isAfterCutoffBeforeStart: false };

                  const attending = displayedEvent.my?.attending || "UNKNOWN";
                  const isGoing = attending === "YES";
                  const requestAlreadySent = requestSentForEventId === displayedEvent.event_id;

                  const canShowRequestButton =
                    isNetPractice &&
                    isAfterCutoffBeforeStart &&
                    !isGoing &&
                    (attending === "UNKNOWN" || attending === "NO");

                  if (isNetPractice && isAfterCutoffBeforeStart && isGoing) {
                    return (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-green-600 justify-center">
                          <Check className="h-5 w-5" />
                          <span className="font-medium">You're going!</span>
                        </div>
                        <p className="text-xs text-muted-foreground text-center">
                          Attendance is closed for this net session (48-hour cutoff).
                        </p>
                      </div>
                    );
                  }

                  if (canShowRequestButton) {
                    return (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground text-center">
                          Attendance is closed for this net session (48-hour cutoff).
                        </p>

                        {requestAlreadySent ? (
                          <Button className="w-full" variant="outline" disabled>
                            Request already submitted ✅
                          </Button>
                        ) : (
                          <Button
                            className="w-full"
                            onClick={() => requestParticipation(displayedEvent.event_id)}
                            disabled={requestStatusLoading || requestingParticipation}
                          >
                            {requestStatusLoading ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Checking...
                              </>
                            ) : requestingParticipation ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Sending...
                              </>
                            ) : (
                              "Request Participation"
                            )}
                          </Button>
                        )}
                      </div>
                    );
                  }

                  const disableAttendanceButtons = isNetPractice && !isNetPracticeOpen;

                  if (attending === "YES") {
                    return (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Check className="h-5 w-5 text-green-600" />
                          <span className="font-medium text-green-600">You're going!</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => markAttending(displayedEvent.event_id, "NO")}
                          disabled={markingAttendance || disableAttendanceButtons}
                        >
                          Change to Not Going
                        </Button>
                      </div>
                    );
                  }

                  if (attending === "NO") {
                    return (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <X className="h-5 w-5 text-muted-foreground" />
                          <span className="text-muted-foreground">Not attending</span>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => markAttending(displayedEvent.event_id, "YES")}
                          disabled={markingAttendance || disableAttendanceButtons}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Change to Going
                        </Button>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">Are you attending this event?</p>
                      <div className="flex gap-2">
                        <Button
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          onClick={() => markAttending(displayedEvent.event_id, "YES")}
                          disabled={markingAttendance || disableAttendanceButtons}
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Yes, I'm Going
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => markAttending(displayedEvent.event_id, "NO")}
                          disabled={markingAttendance || disableAttendanceButtons}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Not This Time
                        </Button>
                      </div>

                      {disableAttendanceButtons && (
                        <p className="text-xs text-muted-foreground text-center">
                          Attendance is closed for this net session (48-hour cutoff).
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>

              {displayedEvent.friendsSummary && (
                <>
                  <Separator className="mt-4" />
                  <div className="flex items-center justify-between pt-4">
                    <Button
                      variant="link"
                      className="p-0 h-auto"
                      onClick={() => setOpenFriendsEventId(displayedEvent.event_id)}
                    >
                      <Users className="h-4 w-4 mr-1" />
                      Friends Going
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {displayedEvent.kids_event ? (
                        <>
                          Kids {displayedEvent.friendsSummary.kids?.yes || 0}/{displayedEvent.friendsSummary.kids?.total || 0}
                        </>
                      ) : (
                        <>
                          {displayedEvent.friendsSummary.men && (
                            <span>
                              Men {displayedEvent.friendsSummary.men.yes}/{displayedEvent.friendsSummary.men.total}
                            </span>
                          )}
                          {displayedEvent.friendsSummary.men &&
                            displayedEvent.friendsSummary.women && <span> • </span>}
                          {displayedEvent.friendsSummary.women && (
                              <span>
                                Women {displayedEvent.friendsSummary.women.yes}/{displayedEvent.friendsSummary.women.total}
                              </span>
                            )}
                          {displayedEvent.friendsSummary.juniors && displayedEvent.friendsSummary.juniors.total > 0 && (
                            <>
                              <span> • </span>
                              <span>
                                Youth {displayedEvent.friendsSummary.juniors.yes}/{displayedEvent.friendsSummary.juniors.total}
                              </span>
                            </>
                          )}
                        </>
                      )}
                    </span>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="text-center py-6">
              <CalendarDays className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No upcoming events</p>
              <Link href="/browse">
                <Button variant="link" className="mt-2">
                  Browse all events
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Last Event Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Last Event
            </CardTitle>
            <Link href="/payments">
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                All Payments <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : lastEvent ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h3 className="font-semibold">{lastEvent.title}</h3>
                    <div>{getEventTypeBadge(lastEvent.event_type)}</div>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">{formatEventDate(lastEvent.starts_at)}</div>
                  {/* Target Groups */}
                  {lastEvent.targetGroups && lastEvent.targetGroups.length > 0 ? (
                    <div className="mt-1 flex items-center gap-1 flex-wrap">
                      {lastEvent.targetGroups.map((grp: string) => (
                        <Badge key={grp} variant="outline" className="text-xs capitalize">
                          {String(grp).toLowerCase()}
                        </Badge>
                      ))}
                    </div>
                  ) : lastEvent.group ? (
                    <div className="mt-1">
                      <Badge variant="outline" className="text-xs capitalize">
                        {String(lastEvent.group).toLowerCase()}
                      </Badge>
                    </div>
                  ) : null}
                </div>
                {lastEvent.fee > 0 && (
                  <div className="text-right">
                    <div className="text-lg font-bold">£{lastEvent.my.fee_due ?? calculateFee(lastEvent.fee, me?.member_type)}</div>
                    <div className="text-xs text-muted-foreground">
                      {me?.member_type === "student" && !lastEvent.my.fee_due ? "Student rate" : "Fee"}
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                {lastEvent.my.paid_status === "PAID" ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <Check className="h-5 w-5" />
                    <span className="font-medium">Payment Confirmed</span>
                  </div>
                ) : lastEvent.my.paid_status === "PENDING" ? (
                  <div className="flex items-center gap-2 text-amber-600">
                    <AlertCircle className="h-5 w-5" />
                    <span className="font-medium">Payment Pending Verification</span>
                  </div>
                ) : lastEvent.my.paid_status === "REJECTED" ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-red-600">
                      <X className="h-5 w-5" />
                      <span className="font-medium">Payment Rejected</span>
                    </div>
                    {!me?.hasPaymentManager ? (
                      <Button className="w-full" onClick={() => markPaid(lastEvent.event_id)} disabled={markingPayment}>
                        <CreditCard className="h-4 w-4 mr-2" />
                        Re-submit Payment
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2 text-amber-600">
                        <AlertCircle className="h-5 w-5" />
                        <span className="text-sm">Payment managed by {me.paymentManagerName}</span>
                      </div>
                    )}
                  </div>
                ) : lastEvent.fee > 0 && lastEvent.my.attended && !me?.hasPaymentManager ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <AlertCircle className="h-5 w-5" />
                      <span>Payment not yet made</span>
                    </div>
                    <Button className="w-full" onClick={() => markPaid(lastEvent.event_id)} disabled={markingPayment}>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Mark as Paid
                    </Button>
                  </div>
                ) : lastEvent.fee > 0 && lastEvent.my.attended && me?.hasPaymentManager ? (
                  <div className="flex items-center gap-2 text-amber-600">
                    <AlertCircle className="h-5 w-5" />
                    <span className="text-sm">Payment managed by {me.paymentManagerName}</span>
                  </div>
                ) : lastEvent.fee > 0 && !lastEvent.my.attended ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <AlertCircle className="h-5 w-5" />
                    <span>Awaiting attendance confirmation</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-green-600">
                    <Check className="h-5 w-5" />
                    <span>No payment required</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <CreditCard className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No recent events</p>
            </div>
          )}
        </CardContent>
      </Card>

      <FriendsGoingModal
        openEventId={openFriendsEventId}
        me={me}
        events={upcomingEvents as any[]}
        modalData={
          (() => {
            const event = upcomingEvents.find(e => e.event_id === openFriendsEventId);
            return (event?.friendsSummary as any) || null;
          })()
        }
        loading={false}
        err=""
        onClose={() => setOpenFriendsEventId(null)}
      />
    </div>
  );
}
