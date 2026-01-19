"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Clock, Users, CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react";
import type { HomeEvent } from "../types";
import { EVENT_TYPE_LABEL } from "../constants";
import { isMembershipEvent, paidLabel } from "../helpers";
import { calculateAge, isAgeInRange, getAgeEligibilityMessage } from "@/lib/ageCalculator";

type Props = {
  ev: HomeEvent;

  selectedYear: number;

  friendsSummary?: { men: { yes: number; total: number }; women: { yes: number; total: number } };
  onOpenFriends: () => void;

  onMarkAttendingYes: () => void;
  onMarkAttendingNo: () => void;
  onMarkPaid: () => void;

  isKidProfile?: boolean;
  kidBirthDate?: Date | null;
};

type Attending = "YES" | "NO" | "UNKNOWN";
type PaidStatus = "UNPAID" | "PENDING" | "PAID" | "REJECTED";

function normAttending(v: any): Attending {
  const s = String(v || "").toUpperCase();
  if (s === "YES" || s === "NO") return s;
  return "UNKNOWN";
}

function normPaid(v: any): PaidStatus {
  const s = String(v || "").toUpperCase();
  if (s === "PAID" || s === "PENDING" || s === "REJECTED") return s;
  return "UNPAID";
}

function getAttendingBadgeVariant(attending: Attending): "default" | "secondary" | "destructive" | "outline" {
  if (attending === "YES") return "default";
  if (attending === "NO") return "destructive";
  return "outline";
}

function getPaidBadgeVariant(status: PaidStatus): "default" | "secondary" | "destructive" | "outline" {
  if (status === "PAID") return "default";
  if (status === "PENDING") return "secondary";
  if (status === "REJECTED") return "destructive";
  return "outline";
}

export function EventCard(p: Props) {
  const ev = p.ev;

  const myAttending = normAttending((ev as any)?.my_attending ?? (ev as any)?.my?.attending);
  const myPaidStatus = normPaid((ev as any)?.my_paid_status ?? (ev as any)?.my?.paid_status);
  const myAttended = !!((ev as any)?.my_attended ?? (ev as any)?.my?.attended);

  const attending = myAttending;
  const paidStatus = myPaidStatus;

  const isPaid = paidStatus === "PAID";
  const isPending = paidStatus === "PENDING";
  const isRejected = paidStatus === "REJECTED";

  const attendedByAdmin = myAttended;

  const startMs = new Date(ev.starts_at as any).getTime();
  const nowMs = Date.now();
  const eventPast = Number.isFinite(startMs) ? startMs <= nowMs : false;

  const baseFee = Number((ev as any)?.fee || 0);

  const dueRaw = (ev as any)?.my_fee_due ?? (ev as any)?.my?.fee_due;
  const due = dueRaw === "" || dueRaw === null || typeof dueRaw === "undefined" ? null : Number(dueRaw);
  const showDue = Number.isFinite(due as any);

  const membership = isMembershipEvent(ev);

  const canMarkPaidNormal =
    eventPast && !isPaid && !isPending && (attendedByAdmin || isRejected);
  const canMarkPaidMembership = !isPaid && !isPending;

  const ageRange = (ev as any)?.age_range;
  const kidAge = p.isKidProfile ? calculateAge(p.kidBirthDate || null) : null;
  const isAgeEligible = ageRange ? isAgeInRange(kidAge, ageRange.min, ageRange.max) : true;
  const ageEligibilityMsg = ageRange && kidAge !== null ? getAgeEligibilityMessage(kidAge, ageRange.min, ageRange.max) : null;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate">{(ev as any).title}</CardTitle>
            <CardDescription className="mt-1 flex items-center gap-2 flex-wrap">
              {membership ? (
                <>
                  <span>Year {p.selectedYear}</span>
                  <span>•</span>
                  <Badge variant="secondary">
                    {EVENT_TYPE_LABEL[(ev as any).event_type] || (ev as any).event_type}
                  </Badge>
                </>
              ) : (
                <>
                  <Clock className="h-3.5 w-3.5" />
                  <span>{new Date((ev as any).starts_at).toLocaleString()}</span>
                  <span>•</span>
                  <Badge variant="secondary">
                    {EVENT_TYPE_LABEL[(ev as any).event_type] || (ev as any).event_type}
                  </Badge>
                </>
              )}
            </CardDescription>
          </div>
          <Badge variant="outline" className="capitalize shrink-0">
            {String((ev as any).group || "").toLowerCase()}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Fee display */}
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold text-primary">
            £{(showDue ? (due as number) : baseFee).toFixed(2)}
          </span>
          {showDue && due !== baseFee && (
            <span className="text-sm text-muted-foreground">
              Standard: £{baseFee.toFixed(2)}
            </span>
          )}
        </div>

        {/* Status badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {!membership && (
            <Badge variant={getAttendingBadgeVariant(attending)} className="gap-1">
              {attending === "YES" && <CheckCircle className="h-3 w-3" />}
              {attending === "NO" && <XCircle className="h-3 w-3" />}
              {attending === "UNKNOWN" && <AlertCircle className="h-3 w-3" />}
              {attending}
            </Badge>
          )}
          <Badge variant={getPaidBadgeVariant(paidStatus)} className="gap-1">
            {isPaid && <CheckCircle className="h-3 w-3" />}
            {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
            {isRejected && <XCircle className="h-3 w-3" />}
            {paidLabel(paidStatus)}
          </Badge>
        </div>

        {/* Age range display for kids events */}
        {ageRange && (
          <div>
            {p.isKidProfile ? (
              isAgeEligible ? (
                <Badge variant="default" className="bg-green-600 gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Age {kidAge} - Eligible (Ages {ageRange.min}-{ageRange.max})
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="h-3 w-3" />
                  {ageEligibilityMsg}
                </Badge>
              )
            ) : (
              <Badge variant="outline">Ages {ageRange.min}-{ageRange.max}</Badge>
            )}
          </div>
        )}

        {/* Friends Going section (non-membership only) */}
        {!membership && (
          <>
            <Separator />
            <div className="flex items-center justify-between">
              <Button variant="link" className="p-0 h-auto" onClick={p.onOpenFriends}>
                <Users className="h-4 w-4 mr-1" />
                Friends Going
              </Button>
              {p.friendsSummary ? (
                <span className="text-sm text-muted-foreground">
                  Men {p.friendsSummary.men.yes}/{p.friendsSummary.men.total} • Women {p.friendsSummary.women.yes}/{p.friendsSummary.women.total}
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">Tap to view</span>
              )}
            </div>
          </>
        )}

        {/* Attendance buttons (non-membership, future events only) */}
        {!membership && !eventPast && (
          <>
            <Separator />
            <div className="flex gap-2">
              <Button
                variant={attending === "YES" ? "default" : "outline"}
                className="flex-1"
                onClick={p.onMarkAttendingYes}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                I&apos;m going
              </Button>
              <Button
                variant={attending === "NO" ? "destructive" : "outline"}
                className="flex-1"
                onClick={p.onMarkAttendingNo}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Not going
              </Button>
            </div>
          </>
        )}

        {/* Payment section */}
        <Separator />
        <div className="space-y-2">
          {isPaid ? (
            <Button variant="outline" className="w-full bg-green-50 text-green-700 border-green-200" disabled>
              <CheckCircle className="h-4 w-4 mr-2" />
              Paid ✅
            </Button>
          ) : isPending ? (
            <Button variant="outline" className="w-full" disabled>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Pending Confirmation ⏳
            </Button>
          ) : membership ? (
            <Button
              variant="default"
              className="w-full"
              onClick={p.onMarkPaid}
              disabled={!canMarkPaidMembership}
            >
              Mark Paid
            </Button>
          ) : !eventPast ? (
            <p className="text-sm text-muted-foreground text-center">
              Payment available after the event starts.
            </p>
          ) : canMarkPaidNormal ? (
            <Button variant="default" className="w-full" onClick={p.onMarkPaid}>
              Mark Paid
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              {attending === "NO"
                ? "You marked Not going. If you actually attended, contact the admin to update attendance."
                : "Attendance must be confirmed by admin before payment. Wait for admin to mark you as attended."}
            </p>
          )}

          {!membership && eventPast && (
            <p className="text-xs text-muted-foreground text-center">
              Attendance is locked after the event starts.
            </p>
          )}

          {isRejected && (
            <p className="text-sm text-destructive">
              Payment was rejected. Please contact admin if this is incorrect, then try again.
            </p>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Saved to Attendance sheet.
        </p>
      </CardContent>
    </Card>
  );
}
