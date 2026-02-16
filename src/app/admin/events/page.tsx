"use client";

import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Home, 
  Users, 
  Baby,
  AlertCircle,
  Shield
} from "lucide-react";
import { useAdminEvents } from "./useAdminEvents";
import { CreateEventCard } from "./components/CreateEventCard";

export default function AdminEventsPage() {
  const s = useAdminEvents();

  // Ensure adult events are NOT created with kids_event flag
  useEffect(() => {
    s.setCreateKidsEvent(false);
  }, []);

  if (s.needsAuth) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground" />
            <h1 className="text-xl font-bold">Admin Access Required</h1>
            <p className="text-sm text-muted-foreground">
              You need to sign in to access the admin panel.
            </p>
            <Button asChild className="w-full">
              <a href="/">
                <Home className="h-4 w-4 mr-2" />
                Go to Home & Sign In
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <Tabs defaultValue="club" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="club" className="gap-2">
            <Users className="h-4 w-4" />
            Club Events
          </TabsTrigger>
          <TabsTrigger value="kids" asChild>
            <a href="/admin/kids-events" className="gap-2 inline-flex items-center justify-center">
              <Baby className="h-4 w-4" />
              Junior Events
            </a>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Error/Message Display */}
      {(s.err || s.msg) && (
        <Card className={s.err ? "border-destructive bg-destructive/5" : "border-accent bg-accent/5"}>
          <CardContent className="pt-4 flex items-start gap-3">
            <AlertCircle className={`h-5 w-5 shrink-0 ${s.err ? "text-destructive" : "text-accent"}`} />
            <p className="text-sm whitespace-pre-wrap">{s.err || s.msg}</p>
          </CardContent>
        </Card>
      )}

      {/* Create Event Card */}
      <CreateEventCard
        eventType={s.eventType}
        setEventType={s.setEventType}
        targetGroups={s.targetGroups}
        setTargetGroups={s.setTargetGroups}
        createKidsEvent={false}
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
        createEvent={s.createEvent}
        isKidsEventPage={false}
      />
    </div>
  );
}
