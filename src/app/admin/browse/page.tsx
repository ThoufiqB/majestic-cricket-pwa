"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  Users, 
  Baby,
  Home,
  Shield
} from "lucide-react";
import { useAdminEvents } from "../events/useAdminEvents";
import { BrowseFilters } from "../events/components/BrowseFilters";
import { EventCard } from "../events/components/EventCard";
import { EditEventModal } from "../events/components/EditEventModal";

export default function AdminBrowsePage() {
  const s = useAdminEvents();
  const [activeTab, setActiveTab] = useState<"adults" | "kids">("adults");
  const [kidsEventType, setKidsEventType] = useState<string>("all");

  // Switch browse mode based on active tab
  useEffect(() => {
    // Reset filters when switching tabs
    s.setBrowseGroup("all");
    setKidsEventType("all");
  }, [activeTab]);

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

  const adultEvents = s.events.filter((ev: any) => ev.kids_event !== true);
  const allKidsEvents = s.events.filter((ev: any) => ev.kids_event === true);
  const kidsEvents = allKidsEvents.filter((ev: any) => 
    kidsEventType === "all" || ev.event_type === kidsEventType
  );

  return (
    <div className="space-y-4">
      {/* Sub-tabs for Adults/Kids */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "adults" | "kids")} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="adults" className="gap-2">
            <Users className="h-4 w-4" />
            Adults
            <Badge variant="secondary" className="ml-1 text-xs">
              {adultEvents.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="kids" className="gap-2">
            <Baby className="h-4 w-4" />
            Kids
            <Badge variant="secondary" className="ml-1 text-xs">
              {allKidsEvents.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* Adults Events Tab */}
        <TabsContent value="adults" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Adult Events
                </CardTitle>
                <Badge variant="secondary">
                  {s.monthLabelFromKey(s.browseMonth)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <BrowseFilters
                monthOptions={s.monthOptions}
                browseMonth={s.browseMonth}
                setBrowseMonth={s.setBrowseMonth}
                browseGroup={s.browseGroup}
                setBrowseGroup={s.setBrowseGroup}
                browseView={s.browseView}
                setBrowseView={s.setBrowseView}
              />

              <Separator />

              <div className="space-y-3">
                {adultEvents.map((ev) => (
                  <EventCard
                    key={ev.event_id}
                    ev={ev}
                    waOpen={s.waOpenEventId === ev.event_id}
                    onOpenWhatsApp={() => s.setWaOpenEventId(ev.event_id)}
                    onCloseWhatsApp={() => s.setWaOpenEventId(null)}
                    onCopyWhatsApp={() => s.copyWhatsApp(ev)}
                    whatsAppText={s.buildWhatsAppText(ev)}
                    formatMembershipSubtitle={s.formatMembershipSubtitle}
                    onDelete={() => s.deleteEvent(ev)}
                    onEdit={() => s.openEdit(ev)}
                    detailPagePath="/admin/events"
                  />
                ))}

                {adultEvents.length === 0 && (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">No adult events for this selection.</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Adjust filters or create new events from the Events tab.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Kids Events Tab */}
        <TabsContent value="kids" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Baby className="h-5 w-5" />
                  Junior Events
                </CardTitle>
                <Badge variant="secondary">
                  {s.monthLabelFromKey(s.browseMonth)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <BrowseFilters
                monthOptions={s.monthOptions}
                browseMonth={s.browseMonth}
                setBrowseMonth={s.setBrowseMonth}
                browseGroup={s.browseGroup}
                setBrowseGroup={s.setBrowseGroup}
                browseView={s.browseView}
                setBrowseView={s.setBrowseView}
                hideGroup={true}
                showEventType={true}
                eventType={kidsEventType}
                setEventType={setKidsEventType}
              />

              <Separator />

              <div className="space-y-3">
                {kidsEvents.map((ev) => (
                  <EventCard
                    key={ev.event_id}
                    ev={ev}
                    waOpen={s.waOpenEventId === ev.event_id}
                    onOpenWhatsApp={() => s.setWaOpenEventId(ev.event_id)}
                    onCloseWhatsApp={() => s.setWaOpenEventId(null)}
                    onCopyWhatsApp={() => s.copyWhatsApp(ev)}
                    whatsAppText={s.buildWhatsAppText(ev)}
                    formatMembershipSubtitle={s.formatMembershipSubtitle}
                    onDelete={() => s.deleteEvent(ev)}
                    onEdit={() => s.openEdit(ev)}
                    detailPagePath="/admin/kids-events"
                  />
                ))}

                {kidsEvents.length === 0 && (
                  <div className="text-center py-8">
                    <Baby className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">No junior events for this selection.</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Adjust filters or create new events from the Events tab.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <EditEventModal
        open={!!s.editingEvent}
        event={s.editingEvent}
        onClose={s.closeEdit}
        onSave={s.saveEdit}
      />
    </div>
  );
}
