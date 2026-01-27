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
  kids_event?: boolean;
  friendsSummary?: {
    men?: { yes: number; total: number; people?: { player_id: string; name: string }[] };
    women?: { yes: number; total: number; people?: { player_id: string; name: string }[] };
    kids?: { yes: number; total: number; people?: { kid_id: string; name: string }[] };
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

function getGroupBadge(group: string) {
  if (group === "men") {
    return <Badge className="bg-blue-100 text-blue-800">Men</Badge>;
  }
  if (group === "women") {
    return <Badge className="bg-pink-100 text-pink-800">Women</Badge>;
  }
  return <Badge variant="outline">{group}</Badge>;
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
  const { activeProfileId, setActiveProfileId: setContextProfileId } = useProfile();

  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [nextEvent, setNextEvent] = useState<DashboardEvent | null>(null);
  const [lastEvent, setLastEvent] = useState<DashboardEvent | null>(null);
  const [stats, setStats] = useState<{ eventsAttendedThisMonth: number; pendingPayments: number } | null>(null);
  const [profile, setProfile] = useState<{ name: string; group: string; email: string } | null>(null);

  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [markingAttendance, setMarkingAttendance] = useState(false);
  const [markingPayment, setMarkingPayment] = useState(false);
  const [openFriendsEventId, setOpenFriendsEventId] = useState<string | null>(null);

  // ✅ Phase-2: request participation UI state (now refresh-proof via backend GET)
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
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProfileId]);

  // If next event changes, clear request-sent UI state (so it doesn’t stick for other events)
  useEffect(() => {
    if (!nextEvent?.event_id) return;
    if (requestSentForEventId && requestSentForEventId !== nextEvent.event_id) {
      setRequestSentForEventId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextEvent?.event_id]);

  async function loadData() {
    setLoading(true);
    try {
      // Get user data
      const meData = await apiGet("/api/me");
      setMe(meData);

      // Check if profile is complete
      if (!meData.group || !meData.member_type) {
        setNeedsProfile(true);
        setLoading(false);
        return;
      }

      // Use activeProfileId from context
      const kidId = activeProfileId && activeProfileId !== meData.player_id ? activeProfileId : null;
      const q = kidId ? `?kidId=${kidId}` : "";
      const dashData = await apiGet(`/api/events/dashboard${q}`);

      const ne: DashboardEvent | null = dashData.nextEvent || null;

      setNextEvent(ne);
      setLastEvent(dashData.lastEvent || null);
      setStats(dashData.stats || null);
      setProfile(dashData.profile || null);

      // ✅ Refresh-proof request state: ask backend if request already exists for this event/profile
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

            if (status?.exists) {
              setRequestSentForEventId(ne.event_id);
            }
          } catch (e) {
            // Don’t break UX if status check fails; button may appear enabled.
            console.warn("Failed to check request status:", e);
          } finally {
            setRequestStatusLoading(false);
          }
        }
      }
    } catch (error) {
      console.error("Failed to load dashboard:", error);
    } finally {
      setLoading(false);
    }
  }

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
      loadData();
    } catch (e) {
      setMsg("Failed to save profile");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSwitchProfile(profileId: string) {
    try {
      await apiPatch(`/api/kids/${profileId}/switch-profile`, {
        active_profile_id: profileId,
      });
      setContextProfileId(profileId);
      setShowProfileDropdown(false);

      // clear request UI state on profile switch (will be recalculated after loadData)
      setRequestSentForEventId(null);
      setRequestingParticipation(false);
      setRequestStatusLoading(false);
    } catch (e) {
      console.error("Failed to switch profile:", e);
      toast.error("Failed to switch profile");
    }
  }

  async function markAttending(eventId: string, attending: "YES" | "NO") {
    setMarkingAttendance(true);
    try {
      const isKidProfile = activeProfileId && activeProfileId !== me?.player_id;

      if (isKidProfile) {
        await apiPost(`/api/kids/${activeProfileId}/attendance`, {
          event_id: eventId,
          attending,
        });
      } else {
        await apiPost(`/api/events/${eventId}/attending`, { attending });
      }

      toast.success(attending === "YES" ? "Marked as attending!" : "Marked as not attending");
      loadData();
    } catch (error) {
      console.error("Failed to mark attendance:", error);
      toast.error("Failed to update attendance");
    } finally {
      setMarkingAttendance(false);
    }
  }

  /** ✅ Phase-2: Request participation after attendance cutoff (Net Practice window only) */
  async function requestParticipation(eventId: string) {
    if (requestingParticipation) return;

    setRequestingParticipation(true);
    try {
      const isKidProfile = activeProfileId && activeProfileId !== me?.player_id;

      if (isKidProfile && activeProfileId) {
        await apiPost(`/api/events/${eventId}/request`, { kid_id: activeProfileId });
      } else {
        await apiPost(`/api/events/${eventId}/request`, {});
      }

      toast.success("Request sent to admin ✅");
      setRequestSentForEventId(eventId); // ✅ prevent re-submits
      loadData();
    } catch (error: any) {
      // If request already exists, treat as a successful/duplicate-safe UX
      if (isAlreadyExistsError(error)) {
        toast.info("Request already submitted ✅");
        setRequestSentForEventId(eventId);
        loadData();
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
      const isKidProfile = activeProfileId && activeProfileId !== me?.player_id;

      if (isKidProfile) {
        await apiPost(`/api/kids/${activeProfileId}/paid`, { event_id: eventId, paid_status: "PENDING" });
      } else {
        await apiPost(`/api/events/${eventId}/paid`, { paid_status: "PENDING" });
      }

      toast.success("Payment marked as pending verification");
      loadData();
    } catch (error) {
      console.error("Failed to mark payment:", error);
      toast.error("Failed to mark payment");
    } finally {
      setMarkingPayment(false);
    }
  }

  // Not logged in
  if (!me && !loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <AuthGateCard onSignedIn={() => window.location.reload()} />
      </div>
    );
  }

  // Needs profile setup
  if (needsProfile && !loading) {
    if (typeof window !== "undefined") {
      window.location.href = "/complete-profile";
    }
    return null;
  }

  const kids: KidProfile[] = me?.kids_profiles || [];
  const hasKids = kids.length > 0;
  const isKidProfile = activeProfileId && activeProfileId !== me?.player_id;
  const currentKid = isKidProfile ? kids.find((k) => k.kid_id === activeProfileId) : null;

  const getActiveProfileName = () => {
    if (isKidProfile && currentKid) return currentKid.name;
    return me?.name || "Welcome";
  };

  return (

    <div className="space-y-4">
      {/* Welcome Banner with background image and gradient overlay */}
      <Card className="relative overflow-hidden min-h-[54px]">
        {/* Background image and overlay - gradient opacity reduced for 30% more image visibility */}
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage:
              'linear-gradient(to bottom, rgba(30,58,95,0.62) 60%, rgba(45,90,138,0.55) 100%), url(/field.JPG)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundAttachment: 'scroll',
            filter: 'brightness(0.98)'
          }}
        />
        <CardContent className="relative z-10 pt-1 pb-1">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-white/30 flex items-center justify-center shadow-md">
                {isKidProfile ? <Baby className="h-7 w-7 text-white drop-shadow" /> : <User className="h-7 w-7 text-white drop-shadow" />}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white mb-1 drop-shadow">Welcome, {getActiveProfileName()}!</h2>                
              </div>
            </div>
            {/* Quick Stats (always visible, responsive) */}
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
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Next Event
            </CardTitle>
            <Link href="/browse">
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                Browse All <ChevronRight className="h-4 w-4 ml-1" />
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
          ) : nextEvent ? (
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-lg">{nextEvent.title}</h3>
                  {getEventTypeBadge(nextEvent.event_type)}
                </div>
                <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    <span>{formatEventDate(nextEvent.starts_at)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>{formatEventTime(nextEvent.starts_at)}</span>
                  </div>
                  {nextEvent.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>{nextEvent.location}</span>
                    </div>
                  )}
                  {nextEvent.event_type === "net_practice" && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Attendance closes 48 hours before this net session.
                    </p>
                  )}
                </div>
              </div>

              {/* Attendance Status & Actions */}
              <div className="border-t pt-4">
                {(() => {
                  const isNetPractice = nextEvent.event_type === "net_practice";
                  const { isNetPracticeOpen, isAfterCutoffBeforeStart } = isNetPractice
                    ? getNetPracticeCutoffInfo(nextEvent.starts_at)
                    : { isNetPracticeOpen: true, isAfterCutoffBeforeStart: false };

                  const attending = nextEvent.my?.attending || "UNKNOWN";
                  const isGoing = attending === "YES";
                  const requestAlreadySent = requestSentForEventId === nextEvent.event_id;

                  // ✅ Phase-2 rule: show Request Participation ONLY if attendance is UNKNOWN or NO
                  const canShowRequestButton =
                    isNetPractice &&
                    isAfterCutoffBeforeStart &&
                    !isGoing &&
                    (attending === "UNKNOWN" || attending === "NO");

                  // If net practice request window but user is already "YES", just show info (no request)
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

                  // ✅ Request window UI
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
                            onClick={() => requestParticipation(nextEvent.event_id)}
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

                  // Default attendance UI; net practice disables after cutoff
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
                          onClick={() => markAttending(nextEvent.event_id, "NO")}
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
                          onClick={() => markAttending(nextEvent.event_id, "YES")}
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
                          onClick={() => markAttending(nextEvent.event_id, "YES")}
                          disabled={markingAttendance || disableAttendanceButtons}
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Yes, I'm Going
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => markAttending(nextEvent.event_id, "NO")}
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

              {/* Friends Going Section */}
              {nextEvent.friendsSummary && (
                <>
                  <Separator className="mt-4" />
                  <div className="flex items-center justify-between pt-4">
                    <Button
                      variant="link"
                      className="p-0 h-auto"
                      onClick={() => setOpenFriendsEventId(nextEvent.event_id)}
                    >
                      <Users className="h-4 w-4 mr-1" />
                      Friends Going
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {nextEvent.kids_event ? (
                        <>
                          Kids {nextEvent.friendsSummary.kids?.yes || 0}/{nextEvent.friendsSummary.kids?.total || 0}
                        </>
                      ) : (
                        <>
                          {(nextEvent.group === "men" || nextEvent.group === "all") && nextEvent.friendsSummary.men && (
                            <span>
                              Men {nextEvent.friendsSummary.men.yes}/{nextEvent.friendsSummary.men.total}
                            </span>
                          )}
                          {nextEvent.group === "all" &&
                            nextEvent.friendsSummary.men &&
                            nextEvent.friendsSummary.women && <span> • </span>}
                          {(nextEvent.group === "women" || nextEvent.group === "all") &&
                            nextEvent.friendsSummary.women && (
                              <span>
                                Women {nextEvent.friendsSummary.women.yes}/{nextEvent.friendsSummary.women.total}
                              </span>
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

      {/* Last Event Card (Payment Focus) */}
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold">{lastEvent.title}</h3>
                    {getEventTypeBadge(lastEvent.event_type)}
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">{formatEventDate(lastEvent.starts_at)}</div>
                </div>
                {lastEvent.fee > 0 && (
                  <div className="text-right">
                    <div className="text-lg font-bold">£{lastEvent.my.fee_due ?? lastEvent.fee}</div>
                    <div className="text-xs text-muted-foreground">Fee</div>
                  </div>
                )}
              </div>

              {/* Payment Status & Actions */}
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
                    <Button className="w-full" onClick={() => markPaid(lastEvent.event_id)} disabled={markingPayment}>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Re-submit Payment
                    </Button>
                  </div>
                ) : lastEvent.fee > 0 && lastEvent.my.attended ? (
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

      {/* ...existing code... */}

      {/* Friends Going Modal */}
      <FriendsGoingModal
        openEventId={openFriendsEventId}
        me={me}
        events={nextEvent ? [nextEvent as any] : []}
        modalData={
          nextEvent && openFriendsEventId === nextEvent.event_id && nextEvent.friendsSummary
            ? (nextEvent.friendsSummary as any)
            : null
        }
        loading={false}
        err=""
        onClose={() => setOpenFriendsEventId(null)}
      />
    </div>
  );
}
