"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
} from "lucide-react";
import Link from "next/link";
import { apiGet, apiPost, apiPatch } from "@/app/client/api";
import { signOutSession } from "@/app/auth";
import { toast } from "sonner";
import { useProfile } from "@/components/context/ProfileContext";

import { AuthGateCard } from "@/app/home/components/AuthGateCard";
import { ProfileGateCard } from "@/app/home/components/ProfileGateCard";
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
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Net Practice</Badge>;
    case "league_match":
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Match</Badge>;
    case "family_event":
      return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Family Event</Badge>;
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

export default function PlayerHomePage() {
  const { setActiveProfileId: setContextProfileId } = useProfile();
  
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [nextEvent, setNextEvent] = useState<DashboardEvent | null>(null);
  const [lastEvent, setLastEvent] = useState<DashboardEvent | null>(null);
  const [stats, setStats] = useState<{ eventsAttendedThisMonth: number; pendingPayments: number } | null>(null);
  const [profile, setProfile] = useState<{ name: string; group: string; email: string } | null>(null);
  
  const [activeProfileId, setActiveProfileIdLocal] = useState<string | null>(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [markingAttendance, setMarkingAttendance] = useState(false);
  const [markingPayment, setMarkingPayment] = useState(false);
  const [openFriendsEventId, setOpenFriendsEventId] = useState<string | null>(null);

  // Wrapper to update both local state and context
  function setActiveProfileId(id: string) {
    setActiveProfileIdLocal(id);
    setContextProfileId(id);
  }

  // Profile setup state
  const [needsProfile, setNeedsProfile] = useState(false);
  const [profileGroup, setProfileGroup] = useState<"" | "men" | "women">("");
  const [profileMemberType, setProfileMemberType] = useState<"" | "standard" | "student">("");
  const [profilePhone, setProfilePhone] = useState<string>("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    loadData();
  }, [activeProfileId]);

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

      // Determine the effective profile ID to use
      // On initial load (activeProfileId is null), use the server's active_profile_id
      // Otherwise use the current activeProfileId state
      let effectiveProfileId = activeProfileId;
      if (!effectiveProfileId) {
        effectiveProfileId = meData.active_profile_id || meData.player_id;
        if (effectiveProfileId) {
          setActiveProfileId(effectiveProfileId);
        }
      }

      // Get dashboard data using the effective profile ID
      const kidId = effectiveProfileId && effectiveProfileId !== meData.player_id ? effectiveProfileId : null;
      const q = kidId ? `?kidId=${kidId}` : "";
      const dashData = await apiGet(`/api/events/dashboard${q}`);
      
      setNextEvent(dashData.nextEvent || null);
      setLastEvent(dashData.lastEvent || null);
      setStats(dashData.stats || null);
      setProfile(dashData.profile || null);
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
      // Always persist the active profile to the server
      // Use the profile ID as the kidId param - the API accepts both player's own ID and kid IDs
      await apiPatch(`/api/kids/${profileId}/switch-profile`, {
        active_profile_id: profileId,
      });
      setActiveProfileId(profileId);
      setShowProfileDropdown(false);
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
      loadData(); // Refresh
    } catch (error) {
      console.error("Failed to mark attendance:", error);
      toast.error("Failed to update attendance");
    } finally {
      setMarkingAttendance(false);
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
      loadData(); // Refresh
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
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <ProfileGateCard
          msg={msg}
          profileGroup={profileGroup}
          setProfileGroup={setProfileGroup}
          profileMemberType={profileMemberType}
          setProfileMemberType={setProfileMemberType}
          profilePhone={profilePhone}
          setProfilePhone={setProfilePhone}
          savingProfile={savingProfile}
          onSave={saveProfile}
          onSignOut={signOut}
        />
      </div>
    );
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
      {/* Welcome Banner */}
      <Card className="bg-gradient-to-r from-[#1e3a5f] to-[#2d5a8a]">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
                {isKidProfile ? (
                  <Baby className="h-7 w-7 text-white" />
                ) : (
                  <User className="h-7 w-7 text-white" />
                )}
              </div>
              <div>
                {hasKids ? (
                  <DropdownMenu open={showProfileDropdown} onOpenChange={setShowProfileDropdown}>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-auto p-0 hover:bg-transparent text-white">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                          {getActiveProfileName()}
                          <ChevronDown className="h-5 w-5 opacity-70" />
                        </h2>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      <DropdownMenuLabel>Switch Profile</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleSwitchProfile(me.player_id)}>
                        <User className="h-4 w-4 mr-2" />
                        {me?.name || "My Profile"}
                        {activeProfileId === me?.player_id && <Check className="h-4 w-4 ml-auto" />}
                      </DropdownMenuItem>
                      {kids.map((kid) => (
                        <DropdownMenuItem key={kid.kid_id} onClick={() => handleSwitchProfile(kid.kid_id)}>
                          <Baby className="h-4 w-4 mr-2" />
                          {kid.name}
                          {kid.age && <span className="text-xs text-muted-foreground ml-1">({kid.age}y)</span>}
                          {activeProfileId === kid.kid_id && <Check className="h-4 w-4 ml-auto" />}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <h2 className="text-xl font-bold text-white">{getActiveProfileName()}</h2>
                )}
                <div className="flex items-center gap-2 mt-1">
                  {!isKidProfile && profile?.group && getGroupBadge(profile.group)}
                  {isKidProfile && <Badge className="bg-pink-100 text-pink-800">Junior</Badge>}
                </div>
              </div>
            </div>
            
            {/* Quick Stats */}
            {stats && (
              <div className="hidden sm:flex gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{stats.eventsAttendedThisMonth}</div>
                  <div className="text-xs text-white/70">This Month</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-300">{stats.pendingPayments}</div>
                  <div className="text-xs text-white/70">Pending</div>
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
                </div>
              </div>

              {/* Attendance Status & Actions */}
              <div className="border-t pt-4">
                {nextEvent.my.attending === "YES" ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-green-600">You're going!</span>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => markAttending(nextEvent.event_id, "NO")}
                      disabled={markingAttendance}
                    >
                      Change to Not Going
                    </Button>
                  </div>
                ) : nextEvent.my.attending === "NO" ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <X className="h-5 w-5 text-muted-foreground" />
                      <span className="text-muted-foreground">Not attending</span>
                    </div>
                    <Button 
                      size="sm"
                      onClick={() => markAttending(nextEvent.event_id, "YES")}
                      disabled={markingAttendance}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Change to Going
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">Are you attending this event?</p>
                    <div className="flex gap-2">
                      <Button 
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        onClick={() => markAttending(nextEvent.event_id, "YES")}
                        disabled={markingAttendance}
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Yes, I'm Going
                      </Button>
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => markAttending(nextEvent.event_id, "NO")}
                        disabled={markingAttendance}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Not This Time
                      </Button>
                    </div>
                  </div>
                )}
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
                        <>Kids {nextEvent.friendsSummary.kids?.yes || 0}/{nextEvent.friendsSummary.kids?.total || 0}</>
                      ) : (
                        <>
                          {(nextEvent.group === "men" || nextEvent.group === "all") && nextEvent.friendsSummary.men && (
                            <span>Men {nextEvent.friendsSummary.men.yes}/{nextEvent.friendsSummary.men.total}</span>
                          )}
                          {nextEvent.group === "all" && nextEvent.friendsSummary.men && nextEvent.friendsSummary.women && (
                            <span> • </span>
                          )}
                          {(nextEvent.group === "women" || nextEvent.group === "all") && nextEvent.friendsSummary.women && (
                            <span>Women {nextEvent.friendsSummary.women.yes}/{nextEvent.friendsSummary.women.total}</span>
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
                <Button variant="link" className="mt-2">Browse all events</Button>
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
                  <div className="mt-1 text-sm text-muted-foreground">
                    {formatEventDate(lastEvent.starts_at)}
                  </div>
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
                    <Button 
                      className="w-full"
                      onClick={() => markPaid(lastEvent.event_id)}
                      disabled={markingPayment}
                    >
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
                    <Button 
                      className="w-full"
                      onClick={() => markPaid(lastEvent.event_id)}
                      disabled={markingPayment}
                    >
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

      {/* Mobile Stats (shown on small screens) */}
      {stats && (
        <Card className="sm:hidden">
          <CardContent className="pt-4">
            <div className="flex justify-around">
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.eventsAttendedThisMonth}</div>
                <div className="text-xs text-muted-foreground">Events This Month</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-600">{stats.pendingPayments}</div>
                <div className="text-xs text-muted-foreground">Pending Payments</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
