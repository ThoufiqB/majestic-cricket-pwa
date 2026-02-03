"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useAdminEventDetails } from "./useAdminEventDetails";
import { EventSummaryCard } from "./components/EventSummaryCard";
import { PlayersSection } from "./components/PlayersSection";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClubLogo } from "@/components/ClubLogo";
import { ArrowLeft, AlertCircle, Shield, Loader2, Baby } from "lucide-react";

export default function AdminKidsEventDetailPage() {
  const params = useParams();
  const eventId = String((params as any)?.eventId || "");

  const { needsAuth, err, msg, event, rows, saving, totals, setAttended, setPaidStatus, bulkMarkAttendedYes } =
    useAdminEventDetails(eventId);

  if (needsAuth) {
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
    <main className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ClubLogo size="sm" />
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Baby className="h-6 w-6 text-accent" />
                Kids Event Details
                <Badge variant="secondary" className="text-xs font-normal">
                  Admin
                </Badge>
              </h1>
              <p className="text-xs text-muted-foreground font-mono">
                ID: {eventId.slice(0, 8)}...
              </p>
            </div>
          </div>
          
        </div>

        {/* Error/Message Display */}
        {(err || msg) && (
          <Card className={err ? "border-destructive bg-destructive/5" : "border-primary/20 bg-primary/5"}>
            <CardContent className="pt-4 flex items-start gap-3">
              <AlertCircle className={`h-5 w-5 shrink-0 ${err ? "text-destructive" : "text-primary"}`} />
              <p className="text-sm whitespace-pre-wrap">
                {err || msg}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {!event && !err && (
          <Card>
            <CardContent className="pt-6 text-center space-y-3">
              <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading event details...</p>
            </CardContent>
          </Card>
        )}

        {/* Event Summary */}
        {event && (
          <EventSummaryCard
            event={event}
            totals={totals}
            rowsCount={rows.length}
            saving={saving}
            onBulkMarkAttendedYes={bulkMarkAttendedYes}
          />
        )}

        {/* Players Section */}
        {event && (
          <PlayersSection
            event={event}
            rows={rows}
            saving={saving}
            onToggleAttended={setAttended}
            onSetPaidStatus={setPaidStatus}
          />
        )}
      </div>
    </main>
  );
}
