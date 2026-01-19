"use client";

import { useCallback } from "react";
import Link from "next/link";
import { useAdminEvents } from "../events/useAdminEvents";
import { CreateEventCard } from "../events/components/CreateEventCard";
import { adminCreateEvent } from "../events/services";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Baby, 
  AlertCircle, 
  CheckCircle2, 
  Shield,
} from "lucide-react";

export default function AdminKidsEventsPage() {
  const s = useAdminEvents();

  // Custom createEvent function that ALWAYS sets kids_event=true
  const createKidsEvent = useCallback(async () => {
    s.setErr("");
    s.setMsg("");
    s.setNeedsAuth(false);

    const title = s.banner.trim();
    if (!title) return s.setErr("Event Banner required");
    if (!Number.isFinite(Number(s.fee))) return s.setErr("Fee must be a number");

    let starts_at = "";
    const isMembership = s.eventType === "membership_fee";
    
    if (isMembership) {
      return s.setErr("Kids events cannot be membership fees");
    } else {
      if (!s.dateStr || s.dateStr.trim() === "") return s.setErr("Date required");
      const parts = s.dateStr.split("-");
      if (parts.length !== 3) return s.setErr("Invalid date format");
      starts_at = s.startIsoFromDateAndTime(s.dateStr, s.hour12, s.minute, s.ampm);
    }

    try {
      // Always create kids event with all_kids group
      await adminCreateEvent({
        title,
        event_type: s.eventType,
        group: "all_kids",
        starts_at,
        fee: Number(s.fee || 0),
        kids_event: true, // ALWAYS true for this page
      });

      s.setFee(0);
      s.setBannerTouched(false);
      s.setDateStr("");
      s.setHour12(6);
      s.setMinute(0);
      s.setAmpm("PM");

      await s.loadBrowse();
      s.setMsg("Event created ✅");
      setTimeout(() => s.setMsg(""), 1200);
    } catch (e: any) {
      const m = String(e?.message || e);
      s.setErr(m);
      if (m.toLowerCase().includes("missing auth")) s.setNeedsAuth(true);
    }
  }, [s]);

  if (s.needsAuth) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <div className="p-6 max-w-md mx-auto">
          <Card>
            <CardContent className="pt-6 text-center space-y-4">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground" />
              <h1 className="text-xl font-bold">Admin Access Required</h1>
              <p className="text-sm text-muted-foreground">
                You're not signed in. Please sign in to access admin features.
              </p>
              <Button asChild>
                <Link href="/">Go to Home</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <Tabs defaultValue="kids" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="adult" asChild>
            <Link href="/admin/events" className="flex items-center gap-2">
              Adult Events
            </Link>
          </TabsTrigger>
          <TabsTrigger value="kids" className="flex items-center gap-2">
            <Baby className="h-4 w-4" />
            Kids Events
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Error/Success Messages */}
      {(s.err || s.msg) && (
        <Card className={s.err ? "border-destructive bg-destructive/5" : "border-green-200 bg-green-50 dark:bg-green-950/20"}>
          <CardContent className="pt-4 flex items-center gap-3">
            {s.err ? (
              <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
            )}
            <p className="text-sm whitespace-pre-wrap">
              {s.err || s.msg}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Create Event Card */}
      <CreateEventCard
        eventType={s.eventType}
        setEventType={s.setEventType}
        createGroup={s.createGroup}
        setCreateGroup={s.setCreateGroup}
        createKidsEvent={true}
        setCreateKidsEvent={() => {}}
        isMembership={s.isMembership}
        dateStr={s.dateStr}
        setDateStr={s.setDateStr}
        hour12={s.hour12}
        setHour12={s.setHour12}
        minute={s.minute}
        setMinute={s.setMinute}
        ampm={s.ampm}
        setAmpm={s.setAmpm}
        membershipYear={s.membershipYear}
        setMembershipYear={s.setMembershipYear}
        yearOptions={s.yearOptions}
        fee={s.fee}
        setFee={s.setFee}
        banner={s.banner}
        setBanner={s.setBanner}
        setBannerTouched={s.setBannerTouched}
        startIsoFromDateAndTime={s.startIsoFromDateAndTime}
        createEvent={createKidsEvent}
        hideKidsEventCheckbox={true}
        isKidsEventPage={true}
      />
    </div>
  );
}
